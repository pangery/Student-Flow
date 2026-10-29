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
    if (name === './semester') return loadService('semester.ts');
    if (name === 'react-native') return { Platform: { OS: 'ios' } };
    if (name === 'expo-device') return { isDevice: true };
    if (name === '@react-native-async-storage/async-storage') {
      const store = new Map();
      return {
        getItem: async (k) => store.get(k) ?? null,
        setItem: async (k, v) => store.set(k, String(v)),
      };
    }
    if (name === 'expo-notifications') {
      return {
        setNotificationHandler: () => {},
        setNotificationChannelAsync: async () => {},
        getPermissionsAsync: async () => ({ status: 'granted' }),
        requestPermissionsAsync: async () => ({ status: 'granted' }),
        getExpoPushTokenAsync: async () => ({ data: 'ExponentPushToken[TestToken123]' }),
        getDevicePushTokenAsync: async () => ({ data: 'apns-device-token-123' }),
        cancelAllScheduledNotificationsAsync: async () => {},
        scheduleNotificationAsync: async (req) => req.identifier || 'mock-id',
        PermissionStatus: { GRANTED: 'granted', DENIED: 'denied', UNDETERMINED: 'undetermined' },
        AndroidImportance: { MAX: 5, HIGH: 4, DEFAULT: 3 },
        SchedulableTriggerInputTypes: { DATE: 'date', TIME_INTERVAL: 'timeInterval' },
      };
    }
    throw new Error(`Unexpected dependency ${name}`);
  }, mod, mod.exports);
  return mod.exports;
}

const notifService = loadService('notifications.ts');

test('parseDateSafe correctly handles ISO and Czech date formats', () => {
  const iso = notifService.parseDateSafe('2026-11-15T22:59:00Z');
  assert.ok(iso instanceof Date);
  assert.equal(iso.getUTCFullYear(), 2026);
  assert.equal(iso.getUTCMonth(), 10); // Nov is 10 in 0-indexed

  const cz = notifService.parseDateSafe('18. 10. 2026');
  assert.ok(cz instanceof Date);
  assert.equal(cz.getFullYear(), 2026);
  assert.equal(cz.getMonth(), 9); // Oct is 9 in 0-indexed
  assert.equal(cz.getDate(), 18);

  assert.equal(notifService.parseDateSafe(undefined), null);
  assert.equal(notifService.parseDateSafe('invalid-date'), null);
});

test('registerForPushNotificationsAsync registers push token on physical device', async () => {
  const result = await notifService.registerForPushNotificationsAsync();
  assert.equal(result.granted, true);
  assert.equal(result.isDevice, true);
  assert.equal(result.token, 'ExponentPushToken[TestToken123]');
});

test('syncCurrentSemesterReminders schedules notifications for current semester items only', async () => {
  const currentTask = {
    id: 't-current',
    title: 'Frontend Clean Code',
    dueDate: '2026-12-13T23:59:00Z',
    isCompleted: false,
    subjectName: 'Frontendové systémy',
  };
  const pastTask = {
    id: 't-past',
    title: 'Starý úkol z loňska',
    dueDate: '2025-04-10T23:59:00Z',
    isCompleted: false,
    subjectName: 'Minulý semestr',
  };
  const currentExam = {
    id: 'e-current',
    title: 'Zkouška Frontend',
    date: '2026-12-20T10:00:00Z',
    isCompleted: false,
    subjectName: 'Frontendové systémy',
  };

  const syncResult = await notifService.syncCurrentSemesterReminders(
    [currentTask, pastTask],
    [currentExam]
  );

  assert.equal(syncResult.scheduledTasks, 1);
  assert.equal(syncResult.scheduledExams, 1);
});

test('sendInstantTestNotification triggers instant test notification', async () => {
  const ok = await notifService.sendInstantTestNotification();
  assert.equal(ok, true);
});

test('scheduleDailyScheduleDigest schedules morning digest for today classes', async () => {
  const mockNow = new Date('2026-10-28T06:00:00Z'); // Wednesday -> weekday 4
  const mockSubjects = [
    {
      id: 'sub-1',
      name: 'Softwarové architektury',
      weekday: mockNow.getDay() + 1,
      startMinutes: 540, // 09:00
      endMinutes: 630,
      location: 'M1-204',
    },
  ];

  const notifId = await notifService.scheduleDailyScheduleDigest(mockSubjects, mockNow);
  assert.ok(notifId !== null);
  assert.match(notifId, /^daily-schedule-/);
});

test('getNotificationTargetTab routes correctly by notification type', () => {
  assert.equal(
    notifService.getNotificationTargetTab({
      notification: { request: { content: { data: { type: 'task_deadline' } } } },
    }),
    'Úkoly'
  );
  assert.equal(
    notifService.getNotificationTargetTab({
      notification: { request: { content: { data: { type: 'exam_reminder' } } } },
    }),
    'Zkouška'
  );
  assert.equal(
    notifService.getNotificationTargetTab({
      notification: { request: { content: { data: { type: 'daily_schedule' } } } },
    }),
    'Rozvrh'
  );
  assert.equal(notifService.getNotificationTargetTab(null), null);
});

test('getNotificationNavigationTarget resolves tab and item IDs correctly', () => {
  assert.deepEqual(
    notifService.getNotificationNavigationTarget({
      notification: { request: { content: { data: { type: 'task_deadline', taskId: 't-123' } } } },
    }),
    { tab: 'Úkoly', taskId: 't-123' }
  );
  assert.deepEqual(
    notifService.getNotificationNavigationTarget({
      notification: { request: { content: { data: { type: 'exam_reminder', examId: 'e-456' } } } },
    }),
    { tab: 'Zkouška', examId: 'e-456' }
  );
  assert.deepEqual(
    notifService.getNotificationNavigationTarget({
      notification: { request: { content: { data: { type: 'daily_schedule' } } } },
    }),
    { tab: 'Rozvrh' }
  );
  assert.equal(notifService.getNotificationNavigationTarget(null), null);
});


