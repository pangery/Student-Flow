const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

function loadService(file, overrides = {}) {
  const output = ts.transpileModule(fs.readFileSync(path.join(__dirname, '../src/services', file), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const mod = { exports: {} };
  new Function('require', 'module', 'exports', output)(name => {
    if (Object.hasOwn(overrides, name)) return overrides[name];
    if (name === './plus4uConfig') return { STUDY_ENGINE_BASE_URI: 'https://school.example/workspace/' };
    if (name === './telemetry') return { telemetry: { stage() {}, call() {}, dataSynced() {} } };
    if (name === './semester') return loadService('semester.ts');
    throw new Error(`Unexpected dependency ${name}`);
  }, mod, mod.exports);
  return mod.exports;
}
const service = loadService('studyEngine.ts', { './plus4uClient': {} });
const identity = 'student-a';
const assignment = { oid: 'a1', name: 'Relační databáze', studyGroupOid: 'g1', toTs: '2026-12-13T22:59:00Z', state: 'assigned' };
const group = { oid: 'g1', name: 'Backendové systémy' };
const step = { oid: 's1', name: 'SQL', assignmentOid: 'a1', kind: 'test', studentResultCacheMap: { [identity]: { state: 'notStarted' } } };
const map = (assignments = [assignment], exams = [], steps = [step]) => service.mapStudyData(assignments, exams, steps, [group], identity);

test('assignments preserve source title, course, deadline and stable identity', () => {
  const { tasks } = map();
  assert.equal(tasks[0].title, assignment.name);
  assert.equal(tasks[0].subjectName, group.name);
  assert.equal(tasks[0].dueDate, assignment.toTs);
  assert.equal(tasks[0].source, 'unicorn');
  assert.match(tasks[0].sourceUrl, /student\/assignmentDetail\?oid=a1$/);
  assert.equal(tasks[0].isCompleted, false);
});
test('test classification uses kind, never title keywords', () => {
  const { exams } = map([assignment], [], [{ ...step, name: 'SQL' }, { ...step, oid: 's2', name: 'Final exam', kind: 'lesson' }]);
  assert.equal(exams.length, 1);
  assert.equal(exams[0].title, 'SQL');
  assert.equal(exams[0].date, assignment.toTs);
  assert.equal(exams[0].subjectName, group.name);
});
test('student results remain authoritative, including reopened and failed work', () => {
  assert.equal(map().tasks[0].isCompleted, false);
  const result = state => map([assignment], [], [{ ...step, studentResultCacheMap: { [identity]: { state } } }]);
  assert.equal(result('readyForEvaluation').tasks[0].isCompleted, true);
  assert.equal(result('needsRevision').tasks[0].isCompleted, false);
  assert.equal(result('completed').exams[0].isCompleted, true);
  assert.equal(result('failed').exams[0].isCompleted, false);
});
test('other students results and memberships never count as own', () => {
  assert.equal(map([assignment], [], [{ ...step, studentResultCacheMap: { other: { state: 'completed' } } }]).tasks[0].isCompleted, false);
  assert.deepEqual(map([{ ...assignment, studentMap: { other: {} } }], [], [{ ...step, studentMap: { other: {} } }]), { tasks: [], exams: [] });
});
test('certification exam does not duplicate its contained test', () => {
  const exam = { ...assignment, oid: 'e1' };
  const { exams } = map([], [exam], [{ ...step, assignmentOid: undefined, certificationExamOid: 'e1' }]);
  assert.equal(exams.length, 1);
  assert.match(exams[0].sourceUrl, /certificationExamDetail/);
});
test('empty results stay empty; missing dates are never fabricated', () => {
  assert.deepEqual(map([], [], []), { tasks: [], exams: [] });
  const result = map([{ ...assignment, toTs: undefined }]);
  assert.equal(result.tasks[0].dueDate, '');
  assert.equal(result.exams[0].date, '');
});
test('all list pages use the authenticated identity and token', async () => {
  const calls = [];
  const api = loadService('studyEngine.ts', { './plus4uClient': { callUuCmd: async (base, command, opts) => {
    calls.push(opts);
    return opts.dtoIn.pageInfo.pageIndex === 0
      ? { itemList: Array.from({ length: 200 }, (_, i) => ({ ...assignment, oid: `a${i}` })), pageInfo: { total: 201 } }
      : { itemList: [{ ...assignment, oid: 'last' }], pageInfo: { total: 201 } };
  } } });
  assert.equal((await api.listStudyEntities('test-token', identity, 'assignment/list')).length, 201);
  assert.deepEqual(calls.map(call => call.dtoIn.pageInfo.pageIndex), [0, 1]);
  assert(calls.every(call => call.dtoIn.studentUuIdentity === identity && call.token === 'test-token'));
});
test('API errors and malformed responses never become successful empty lists', async () => {
  for (const response of [null, { data: [] }, { itemList: [{}] }]) {
    const api = loadService('studyEngine.ts', { './plus4uClient': { callUuCmd: async () => response } });
    await assert.rejects(api.listStudyEntities('token', identity, 'assignment/list'));
  }
  const api = loadService('studyEngine.ts', { './plus4uClient': { callUuCmd: async () => { throw new Error('HTTP 403'); } } });
  await assert.rejects(api.fetchStudentStudyData('token', identity), /403/);
});
test('diary parser no longer creates assignments or tests from text', () => {
  const diary = loadService('plus4uSync.ts', { './plus4uClient': {}, './studyEngine': {} });
  const result = diary.parseDiaryRecords([{ id: 'd1', name: 'Test – projekt deadline', startTime: '2026-10-27T09:00:00Z', endTime: '2026-10-27T10:00:00Z' }]);
  assert.deepEqual(result.tasks, []);
  assert.deepEqual(result.exams, []);
});
test('a diary outage does not discard successfully loaded school assignments', async () => {
  const diary = loadService('plus4uSync.ts', {
    './plus4uClient': { callUuCmd: async () => { throw new Error('diary unavailable'); } },
    './studyEngine': { fetchStudentStudyData: async () => map() },
  });
  const result = await diary.syncStudentDataFromPlus4U('token', identity);
  assert.equal(result.tasks.length, 1);
  assert.equal(result.exams.length, 1);
  assert.equal(result.diaryLoaded, false);
  assert.equal(result.warnings.length, 1);
});
test('past semester assignments and tests are excluded from active study data', () => {
  const oldAssignment = { ...assignment, oid: 'old-1', toTs: '2025-11-20T10:00:00Z' };
  const oldStep = { ...step, oid: 'old-s1', assignmentOid: 'old-1', toTs: '2025-11-20T10:00:00Z' };
  const result = map([oldAssignment, assignment], [], [oldStep, step]);
  assert.equal(result.tasks.length, 1);
  assert.equal(result.tasks[0].id, 'study_assignment_a1');
  assert.equal(result.exams.length, 1);
  assert.equal(result.exams[0].id, 'study_test_s1');
});
