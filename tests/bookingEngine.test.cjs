const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

function loadTsModule(file) {
  const output = ts.transpileModule(
    fs.readFileSync(path.join(__dirname, '../src/services', file), 'utf8'),
    {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }
  ).outputText;
  const mod = { exports: {} };
  new Function('require', 'module', 'exports', output)(() => { }, mod, mod.exports);
  return mod.exports;
}

function loadBookingEngine() {
  const output = ts.transpileModule(
    fs.readFileSync(path.join(__dirname, '../src/services/bookingEngine.ts'), 'utf8'),
    {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }
  ).outputText;

  const mod = { exports: {} };
  const store = new Map();

  new Function('require', 'module', 'exports', output)((name) => {
    if (name === '@react-native-async-storage/async-storage') {
      return {
        getItem: async (k) => store.get(k) ?? null,
        setItem: async (k, v) => store.set(k, String(v)),
        removeItem: async (k) => store.delete(k),
      };
    }
    if (name === './plus4uClient') {
      return {
        callUuCmd: async () => ({}),
      };
    }
    if (name === './plus4uConfig') {
      return {
        BOOKING_ENGINE_BASE_URI: '',
      };
    }
    if (name === './semester') {
      return loadTsModule('semester.ts');
    }
    if (name === './schoolDisplay') {
      return loadTsModule('schoolDisplay.ts');
    }
    throw new Error(`Unexpected dependency ${name}`);
  }, mod, mod.exports);

  return mod.exports;
}

test('getAvailableExamSlots returns available exam dates and marks enrollment accurately', async () => {
  const engine = loadBookingEngine();
  const slots = await engine.getAvailableExamSlots(['booking_slot-vma-1']);

  assert.ok(slots.length >= 4, 'Must return at least 4 available exam slots');
  const vmaSlot = slots.find((s) => s.id === 'slot-vma-1');
  assert.ok(vmaSlot, 'VMA slot must exist');
  assert.equal(vmaSlot.isEnrolled, true, 'VMA slot should be marked as enrolled');

  const dbSlot = slots.find((s) => s.id === 'slot-db-1');
  assert.ok(dbSlot, 'DB slot must exist');
  assert.equal(dbSlot.isEnrolled, false, 'DB slot should not be enrolled');
});

test('bookExamSlot enrolls student, increases enrolledCount, and creates new ExamItem', async () => {
  const engine = loadBookingEngine();
  const currentExams = [];

  const result = await engine.bookExamSlot('slot-db-1', currentExams);
  assert.equal(result.success, true);
  assert.equal(result.newExam.id, 'booking_slot-db-1');
  assert.equal(result.newExam.subjectName, 'Databázové systémy');
  assert.equal(result.updatedExams.length, 1);

  const updatedSlots = await engine.getAvailableExamSlots(['booking_slot-db-1']);
  const dbSlot = updatedSlots.find((s) => s.id === 'slot-db-1');
  assert.equal(dbSlot.isEnrolled, true);
  assert.equal(dbSlot.enrolledCount, 32); // was 31 in initial
});

test('cancelExamSlotBooking unenrolls student, decreases count, and removes from exams list', async () => {
  const engine = loadBookingEngine();
  const initialBooking = await engine.bookExamSlot('slot-swe-1', []);
  assert.equal(initialBooking.updatedExams.length, 1);

  const cancelResult = await engine.cancelExamSlotBooking('slot-swe-1', initialBooking.updatedExams);
  assert.equal(cancelResult.success, true);
  assert.equal(cancelResult.updatedExams.length, 0);

  const updatedSlots = await engine.getAvailableExamSlots([]);
  const sweSlot = updatedSlots.find((s) => s.id === 'slot-swe-1');
  assert.equal(sweSlot.isEnrolled, false);
});

test('isRealExamOrTest strictly separates genuine exams from ordinary tasks and self-study', () => {
  const { isRealExamOrTest } = loadTsModule('schoolDisplay.ts');

  // Real exams and tests must pass
  assert.equal(isRealExamOrTest({ title: 'Zkouška – Vývoj mobilních aplikací' }), true);
  assert.equal(isRealExamOrTest({ title: 'Zápočtový test – Databázové systémy' }), true);
  assert.equal(isRealExamOrTest({ title: 'Předtermín – Softwarové inženýrství' }), true);
  assert.equal(isRealExamOrTest({ title: 'Ústní obhajoba projektu', examType: 'oral' }), true);
  assert.equal(isRealExamOrTest({ title: 'Distanční test', isDistanceExam: true }), true);
  assert.equal(isRealExamOrTest({ title: 'Certifikační zkouška', examType: 'certification' }), true);

  // Normal tasks, self-study, and assignments must be excluded from exam section
  assert.equal(isRealExamOrTest({ title: 'Samostudium kapitoly 3' }), false);
  assert.equal(isRealExamOrTest({ title: 'Domácí úkol č. 2' }), false);
  assert.equal(isRealExamOrTest({ title: 'Cvičení k tématu – Git branching' }), false);
});

test('isPureTask ensures Tasks screen only loads pure tasks and excludes tests/exams', () => {
  const { isPureTask } = loadTsModule('schoolDisplay.ts');

  // Pure tasks must pass
  assert.equal(isPureTask({ title: 'Odevzdat návrh mobilní aplikace' }), true);
  assert.equal(isPureTask({ title: 'Semestrální práce – databázové schéma' }), true);
  assert.equal(isPureTask({ title: 'Příprava na prezentaci projektu' }), true);
  assert.equal(isPureTask({ title: 'Domácí úkol č. 1' }), true);

  // Exams, tests, and distance exams must be excluded from Tasks
  assert.equal(isPureTask({ title: 'Zkouška – Vývoj mobilních aplikací' }), false);
  assert.equal(isPureTask({ title: 'Zápočtový test – Databázové systémy' }), false);
  assert.equal(isPureTask({ title: 'Předtermín – Softwarové inženýrství' }), false);
  assert.equal(isPureTask({ title: 'Písemný test z databází', isDistanceExam: true }), false);
  assert.equal(isPureTask({ title: 'Distanční zkouška', examType: 'distance' }), false);
  assert.equal(isPureTask({ title: 'Certifikační zkouška', examType: 'certification' }), false);
});

