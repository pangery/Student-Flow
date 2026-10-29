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
  new Function('require', 'module', 'exports', output)(() => {}, mod, mod.exports);
  return mod.exports;
}

function loadTextbookService(overrides = {}) {
  const output = ts.transpileModule(
    fs.readFileSync(path.join(__dirname, '../src/services/textbookService.ts'), 'utf8'),
    {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }
  ).outputText;
  const mod = { exports: {} };
  const store = new Map();
  const secureStore = new Map();

  new Function('require', 'module', 'exports', output)((name) => {
    if (Object.hasOwn(overrides, name)) return overrides[name];
    if (name === './sampleTextbooks') {
      return loadTsModule('sampleTextbooks.ts');
    }
    if (name === '@react-native-async-storage/async-storage') {
      return {
        getItem: async (k) => store.get(k) ?? null,
        setItem: async (k, v) => store.set(k, String(v)),
        removeItem: async (k) => store.delete(k),
        multiRemove: async (keys) => keys.forEach((k) => store.delete(k)),
      };
    }
    if (name === 'expo-secure-store') {
      return {
        getItemAsync: async (k) => secureStore.get(k) ?? null,
        setItemAsync: async (k, v) => secureStore.set(k, String(v)),
        deleteItemAsync: async (k) => secureStore.delete(k),
      };
    }
    throw new Error(`Unexpected dependency ${name}`);
  }, mod, mod.exports);
  return mod.exports;
}

test('computeContentHash generates deterministic integrity checksums', () => {
  const service = loadTextbookService();
  const hash1 = service.computeContentHash('chapter text data', 'test-salt-123');
  const hash2 = service.computeContentHash('chapter text data', 'test-salt-123');
  const hashDifferent = service.computeContentHash('tampered chapter text', 'test-salt-123');

  assert.equal(hash1, hash2);
  assert.notEqual(hash1, hashDifferent);
  assert.equal(typeof hash1, 'string');
  assert.equal(hash1.length, 8);
});

test('downloadForOffline stores textbook securely with checksum and per-student isolation', async () => {
  const service = loadTextbookService();
  const studentA = '24-1111-1';
  const studentB = '25-2222-2';

  const ok = await service.textbookService.downloadForOffline('book-vma', studentA);
  assert.equal(ok, true);

  const metaA = await service.textbookService.getCachedMeta(studentA);
  assert.ok(metaA['book-vma']);
  assert.ok(metaA['book-vma'].checksum);

  // Student B does not see Student A's local cache
  const metaB = await service.textbookService.getCachedMeta(studentB);
  assert.equal(metaB['book-vma'], undefined);
});

test('runAutoCacheForEnrolledSubjects caches only subjects student is enrolled in', async () => {
  const service = loadTextbookService();
  const studentId = '24-3333-3';
  const enrolledSubjects = [
    {
      id: 'sub-1',
      name: 'Vývoj mobilních aplikací',
      code: 'UU.APP.DEV',
      weekday: 2,
      startMinutes: 540,
      endMinutes: 630,
    },
  ];

  const result = await service.textbookService.runAutoCacheForEnrolledSubjects(enrolledSubjects, studentId);
  assert.equal(result.attempted, 1);
  assert.equal(result.newlyCached, 1);
  assert.equal(result.failed, 0);

  // Re-running auto cache detects existing valid cache
  const secondRun = await service.textbookService.runAutoCacheForEnrolledSubjects(enrolledSubjects, studentId);
  assert.equal(secondRun.alreadyCached, 1);
  assert.equal(secondRun.newlyCached, 0);
});

test('loadTextbookForReading verifies integrity and rejects tampered local cache', async () => {
  const store = new Map();
  const secureStore = new Map();
  const output = ts.transpileModule(
    fs.readFileSync(path.join(__dirname, '../src/services/textbookService.ts'), 'utf8'),
    {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }
  ).outputText;
  const mod = { exports: {} };

  new Function('require', 'module', 'exports', output)((name) => {
    if (name === './sampleTextbooks') {
      return loadTsModule('sampleTextbooks.ts');
    }
    if (name === '@react-native-async-storage/async-storage') {
      return {
        getItem: async (k) => store.get(k) ?? null,
        setItem: async (k, v) => store.set(k, String(v)),
        removeItem: async (k) => store.delete(k),
        multiRemove: async (keys) => keys.forEach((k) => store.delete(k)),
      };
    }
    if (name === 'expo-secure-store') {
      return {
        getItemAsync: async (k) => secureStore.get(k) ?? null,
        setItemAsync: async (k, v) => secureStore.set(k, String(v)),
        deleteItemAsync: async (k) => secureStore.delete(k),
      };
    }
    throw new Error(`Unexpected dependency ${name}`);
  }, mod, mod.exports);

  const service = mod.exports.textbookService;
  const student = '24-integrity-test';
  await service.downloadForOffline('book-vma', student);

  // 1. Valid read
  const validRead = await service.loadTextbookForReading('book-vma', student);
  assert.equal(validRead.fromCache, true);
  assert.equal(validRead.verifiedSecure, true);

  // 2. Simulate malicious tampering of local textbook content in storage
  const bookKey = service.getBookKey('book-vma', student);
  const originalData = JSON.parse(store.get(bookKey));
  originalData.title = 'Hacked / Corrupted Textbook';
  store.set(bookKey, JSON.stringify(originalData));

  // 3. Reader detects tampering, invalidates corrupt cache and falls back to server origin
  const tamperedRead = await service.loadTextbookForReading('book-vma', student);
  assert.equal(tamperedRead.fromCache, false);
  assert.equal(tamperedRead.verifiedSecure, false);
});
