import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  completePlus4ULogin,
  isSystemBrowserLoginAvailable,
  LoginCancelledError,
  loginWithSystemBrowser,
  restoreSession,
  tokenStore,
  type Session,
} from '../services/auth';

export type AuthContextType = {
  session: Session | null;
  restoring: boolean;
  connected: boolean;
  isSystemBrowserAvailable: boolean;
  completeLogin: (code: string, redirectUri?: string) => Promise<Session>;
  loginWithBrowser: () => Promise<Session | null>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [restoring, setRestoring] = useState(true);
  const [session, setSession] = useState<Session | null>(null);

  const isSystemBrowserAvailable = useMemo(() => isSystemBrowserLoginAvailable(), []);

  useEffect(() => {
    restoreSession()
      .then((restored) => {
        if (restored) {
          setSession(restored);
        }
      })
      .catch(() => {})
      .finally(() => {
        setRestoring(false);
      });
  }, []);

  const completeLogin = useCallback(async (code: string, redirectUri?: string) => {
    const next = await completePlus4ULogin(code, redirectUri);
    setSession(next);
    return next;
  }, []);

  const loginWithBrowser = useCallback(async (): Promise<Session | null> => {
    try {
      const { code, redirectUri } = await loginWithSystemBrowser();
      return await completeLogin(code, redirectUri);
    } catch (e) {
      if (e instanceof LoginCancelledError) {
        return null;
      }
      throw e;
    }
  }, [completeLogin]);

  const logout = useCallback(async () => {
    await tokenStore.clear();
    setSession(null);
  }, []);

  const value = useMemo(
    () => ({
      session,
      restoring,
      connected: session != null,
      isSystemBrowserAvailable,
      completeLogin,
      loginWithBrowser,
      logout,
    }),
    [session, restoring, isSystemBrowserAvailable, completeLogin, loginWithBrowser, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an <AuthProvider>');
  }
  return ctx;
}
