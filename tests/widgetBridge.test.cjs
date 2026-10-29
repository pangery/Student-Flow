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
    if (name === './semester') {
      const semOutput = ts.transpileModule(fs.readFileSync(path.join(__dirname, '../src/services/semester.ts'), 'utf8'), {
        compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
      }).outputText;
      const semMod = { exports: {} };
      new Function('require', 'module', 'exports', semOutput)(() => {}, semMod, semMod.exports);
      return semMod.exports;
    }
    if (name === 'react-native') {
      return {
        NativeModules: {
          StudentFlowWidgetBridge: {
            updateWidgetData: async () => true,
          },
        },
      };
    }
    if (name === '@react-native-async-storage/async-storage') {
      const store = new Map();
      return {
        getItem: async (k) => store.get(k) ?? null,
        setItem: async (k, v) => store.set(k, String(v)),
      };
    }
    throw new Error(`Unexpected dependency ${name}`);
  }, mod, mod.exports);
  return mod.exports;
}

const widgetService = loadService('widgetBridge.ts');

test('buildWidgetSnapshot creates accurate snapshot of today lessons, upcoming task, and exam', () => {
  // Wednesday at 10:00 (10*60 = 600 minutes)
  const now = new Date('2026-10-28T10:00:00'); // Wednesday: day 3 in JS -> weekday 4 in school calendar
  const currentWeekday = now.getDay() + 1;

  const mockData = {
    studentName: 'Jan Gergel',
    uuIdentity: '12-3456-1',
    subjects: [
      {
        id: 's1',
        name: 'Softwarové architektury',
        weekday: currentWeekday,
        startMinutes: 540, // 09:00 - 10:30 (currently ongoing)
        endMinutes: 630,
        location: 'M1-204',
        code: 'UU-UAA',
      },
      {
        id: 's2',
        name: 'Vývoj mobilních aplikací',
        weekday: currentWeekday,
        startMinutes: 660, // 11:00 - 12:30
        endMinutes: 750,
        location: 'Online',
        code: 'UU-VMA',
      },
      {
        id: 's3',
        name: 'Databázové systémy',
        weekday: currentWeekday === 6 ? 2 : currentWeekday + 1, // other day
        startMinutes: 480,
        endMinutes: 570,
        location: 'M2-101',
      },
    ],
    tasks: [
      {
        id: 't1',
        title: 'Architektonický návrh',
        subjectName: 'Softwarové architektury',
        dueDate: '2026-10-29T23:59:00', // Tomorrow
        isCompleted: false,
      },
      {
        id: 't2',
        title: 'Hotový úkol',
        subjectName: 'Databázové systémy',
        dueDate: '2026-10-20T23:59:00',
        isCompleted: true,
      },
    ],
    exams: [
      {
        id: 'e1',
        title: 'Zkouška Softwarové architektury',
        subjectName: 'Softwarové architektury',
        date: '2026-11-15T09:00:00',
        isCompleted: false,
      },
    ],
  };

  const snapshot = widgetService.buildWidgetSnapshot(mockData, now);

  assert.equal(snapshot.studentName, 'Jan Gergel');
  assert.equal(snapshot.uuIdentity, '12-3456-1');
  assert.equal(snapshot.todayLessonsCount, 2);
  assert.ok(snapshot.currentOrNextLesson);
  assert.equal(snapshot.currentOrNextLesson.name, 'Softwarové architektury');
  assert.equal(snapshot.currentOrNextLesson.room, 'M1-204');
  assert.equal(snapshot.currentOrNextLesson.isNowOrNext, true);

  assert.ok(snapshot.nextTask);
  assert.equal(snapshot.nextTask.title, 'Architektonický návrh');
  assert.equal(snapshot.nextTask.isUrgent, true);
  assert.equal(snapshot.pendingTasksCount, 1);

  assert.ok(snapshot.nextExam);
  assert.equal(snapshot.nextExam.subjectName, 'Softwarové architektury');
  assert.ok(snapshot.nextExam.daysRemaining > 0);
});

test('updateWidgetSnapshot serializes and saves to storage without errors', async () => {
  const mockData = {
    studentName: 'Test Student',
    subjects: [],
    tasks: [],
    exams: [],
  };

  const snapshot = await widgetService.updateWidgetSnapshot(mockData);
  assert.equal(snapshot.studentName, 'Test Student');

  const loaded = await widgetService.loadWidgetSnapshot();
  assert.ok(loaded);
  assert.equal(loaded.studentName, 'Test Student');
});
