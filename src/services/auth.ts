import * as SecureStore from 'expo-secure-store';
import {
  decodeJwt,
  exchangeCode,
  getDisplayName,
  getUuIdentity,
  isExpired,
  type IdTokenClaims,
} from './plus4uOidc';
import {
  isSystemBrowserLoginAvailable,
  LoginCancelledError,
  loginWithSystemBrowser,
} from './systemBrowserLogin';

export { isSystemBrowserLoginAvailable, LoginCancelledError, loginWithSystemBrowser };

const TOKEN_KEY = 'studentflow.plus4u.id_token';

export type Session = {
  idToken: string;
  claims: IdTokenClaims;
  uuIdentity: string;
  name: string;
};

export function toSession(idToken: string): Session {
  const claims = decodeJwt(idToken);
  return {
    idToken,
    claims,
    uuIdentity: getUuIdentity(claims),
    name: getDisplayName(claims),
  };
}

export const tokenStore = {
  load: () => SecureStore.getItemAsync(TOKEN_KEY),
  save: (token: string) => SecureStore.setItemAsync(TOKEN_KEY, token),
  clear: () => SecureStore.deleteItemAsync(TOKEN_KEY),
};

export function isSessionExpired(session: Session | null, skewSeconds = 30): boolean {
  if (!session?.claims) return false;
  return isExpired(session.claims, skewSeconds);
}

export type SessionState = {
  session: Session | null;
  isExpired: boolean;
  expiredIdentity: string | null;
  expiredName: string | null;
};

export async function checkStoredSessionState(): Promise<SessionState> {
  try {
    const token = await tokenStore.load();
    if (!token) {
      return { session: null, isExpired: false, expiredIdentity: null, expiredName: null };
    }

    const session = toSession(token);
    if (isExpired(session.claims)) {
      return {
        session: null,
        isExpired: true,
        expiredIdentity: session.uuIdentity,
        expiredName: session.name,
      };
    }

    return {
      session,
      isExpired: false,
      expiredIdentity: null,
      expiredName: null,
    };
  } catch {
    return { session: null, isExpired: false, expiredIdentity: null, expiredName: null };
  }
}

export async function restoreSession(): Promise<Session | null> {
  const state = await checkStoredSessionState();
  return state.session;
}

/**
 * Dokončí přihlášení výměnou autorizačního kódu za id_token.
 * redirectUri musí přesně odpovídat adrese předané do authorize požadavku.
 */
export async function completePlus4ULogin(
  code: string,
  redirectUri?: string
): Promise<Session> {
  const tokens = await exchangeCode(code, redirectUri);
  const session = toSession(tokens.id_token);
  await tokenStore.save(tokens.id_token);
  return session;
}

export type LoginResult =
  | { type: 'success'; session: Session }
  | { type: 'cancelled' }
  | { type: 'fallback_to_webview' };

/**
 * Spustí přihlašovací proces:
 * 1. Pokud je k dispozici nativní systémový prohlížeč (development build), provede
 *    systémové přihlášení s cookies sdílenými se Safari / Chrome.
 * 2. Pokud není k dispozici (např. Expo Go), vrátí fallback na interní WebView.
 */
export async function startPlus4ULogin(): Promise<LoginResult> {
  if (!isSystemBrowserLoginAvailable()) {
    return { type: 'fallback_to_webview' };
  }

  try {
    const { code, redirectUri } = await loginWithSystemBrowser();
    const session = await completePlus4ULogin(code, redirectUri);
    return { type: 'success', session };
  } catch (err) {
    if (err instanceof LoginCancelledError) {
      return { type: 'cancelled' };
    }
    throw err;
  }
}
