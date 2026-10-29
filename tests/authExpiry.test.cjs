const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

function loadAuthService(mockToken = null) {
  const output = ts.transpileModule(fs.readFileSync(path.join(__dirname, '../src/services/auth.ts'), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const mod = { exports: {} };
  new Function('require', 'module', 'exports', output)(name => {
    if (name === './plus4uOidc') {
      const oidcOutput = ts.transpileModule(fs.readFileSync(path.join(__dirname, '../src/services/plus4uOidc.ts'), 'utf8'), {
        compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
      }).outputText;
      const oidcMod = { exports: {} };
      new Function('require', 'module', 'exports', oidcOutput)((dep) => {
        if (dep === './plus4uConfig') {
          return { OIDC_CLIENT_ID: 'c', OIDC_CLIENT_SECRET: 's', OIDC_SCOPE: 'openid', OIDC_URI: 'https://oidc', REDIRECT_URI: 'https://red' };
        }
        if (dep === './telemetry') {
          return { telemetry: { stage: () => {}, call: () => {} } };
        }
        throw new Error(`Unexpected oidc dep ${dep}`);
      }, oidcMod, oidcMod.exports);
      return oidcMod.exports;
    }
    if (name === './systemBrowserLogin') {
      return { isSystemBrowserLoginAvailable: () => false, LoginCancelledError: class extends Error {}, loginWithSystemBrowser: async () => ({}) };
    }
    if (name === 'expo-secure-store') {
      let stored = mockToken;
      return {
        getItemAsync: async () => stored,
        setItemAsync: async (k, v) => { stored = v; },
        deleteItemAsync: async () => { stored = null; },
      };
    }
    throw new Error(`Unexpected dependency ${name}`);
  }, mod, mod.exports);
  return mod.exports;
}

function makeJwt(payload) {
  const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${header}.${body}.sig`;
}

test('isSessionExpired returns false for fresh token and true for expired token', () => {
  const auth = loadAuthService();
  const futureExp = Math.floor(Date.now() / 1000) + 3600; // 1 hour in future
  const freshSession = {
    idToken: 'token',
    claims: { exp: futureExp, name: 'Jan Gergel', uuidentity: '12-3456-1' },
    uuIdentity: '12-3456-1',
    name: 'Jan Gergel',
  };
  assert.equal(auth.isSessionExpired(freshSession), false);

  const pastExp = Math.floor(Date.now() / 1000) - 60; // 60s in past
  const expiredSession = {
    ...freshSession,
    claims: { ...freshSession.claims, exp: pastExp },
  };
  assert.equal(auth.isSessionExpired(expiredSession), true);
});

test('checkStoredSessionState detects expired token and preserves student identity without wiping data', async () => {
  const pastExp = Math.floor(Date.now() / 1000) - 300;
  const expiredJwt = makeJwt({
    uuidentity: '4017-3144-1',
    name: 'Jan Gergel',
    exp: pastExp,
  });

  const auth = loadAuthService(expiredJwt);
  const state = await auth.checkStoredSessionState();

  assert.equal(state.isExpired, true);
  assert.equal(state.session, null);
  assert.equal(state.expiredIdentity, '4017-3144-1');
  assert.equal(state.expiredName, 'Jan Gergel');
});

test('checkStoredSessionState returns valid session for unexpired token', async () => {
  const futureExp = Math.floor(Date.now() / 1000) + 7200;
  const validJwt = makeJwt({
    uuidentity: '4017-3144-1',
    name: 'Jan Gergel',
    exp: futureExp,
  });

  const auth = loadAuthService(validJwt);
  const state = await auth.checkStoredSessionState();

  assert.equal(state.isExpired, false);
  assert.ok(state.session);
  assert.equal(state.session.uuIdentity, '4017-3144-1');
  assert.equal(state.session.name, 'Jan Gergel');
});
