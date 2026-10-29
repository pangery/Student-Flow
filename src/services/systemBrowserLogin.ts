import { NativeModules } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { APP_CALLBACK_URL } from './plus4uConfig';
import { buildAuthorizeUrl, getMetadata, parseRedirect } from './plus4uOidc';
import { telemetry } from './telemetry';

/**
 * Přihlášení v systémovém prohlížeči – stejný princip jako uuAppDevKit:
 *
 * 1. Aplikace spustí lokální HTTP server na 127.0.0.1:<náhodný port> (react-native-tcp-socket).
 * 2. Otevře authorize URL přes ASWebAuthenticationSession (iOS) / Custom Tabs (Android).
 *    Toto systémové okno sdílí cookies se Safari / Chrome, takže pokud je student
 *    přihlášený (Plus4U, Google SSO), přihlášení proběhne na jedno klepnutí.
 * 3. OIDC přesměruje na http://127.0.0.1:<port>?code=… – požadavek obslouží lokální server.
 * 4. Server odpoví 302 na studentflow://auth a přihlašovací okno se tím automaticky zavře.
 *
 * Vyžaduje development build: Expo Go nativní modul TcpSockets neobsahuje.
 */

export class LoginCancelledError extends Error {
  constructor() {
    super('Přihlášení bylo zrušeno uživatelem');
    this.name = 'LoginCancelledError';
  }
}

/**
 * Zjistí, zda je k dispozici nativní modul TcpSockets pro systémový prohlížeč.
 */
export function isSystemBrowserLoginAvailable(): boolean {
  return (NativeModules as any).TcpSockets != null;
}

export type CallbackServer = {
  redirectUri: string;
  code: Promise<string>;
  close: () => void;
};

/**
 * Spustí dočasný TCP HTTP server, který čeká na jediný redirect požadavek s ?code=.
 */
async function startCallbackServer(): Promise<CallbackServer> {
  // Dynamický import pro bezpečnost v Expo Go prostředí
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const TcpSocket = require('react-native-tcp-socket');

  let redirectUri = '';
  let resolveCode!: (code: string) => void;
  let rejectCode!: (err: Error) => void;

  const code = new Promise<string>((resolve, reject) => {
    resolveCode = resolve;
    rejectCode = reject;
  });
  // Zamezí "unhandled promise rejection", chybu obslouží volající
  code.catch(() => {});

  const server = TcpSocket.createServer((socket: any) => {
    let request = '';
    socket.on('data', (chunk: any) => {
      request += chunk.toString();
      if (!request.includes('\r\n')) return; // čekáme na kompletní první řádek

      // První řádek HTTP požadavku: "GET /?code=abc HTTP/1.1"
      const firstLine = request.split('\r\n')[0] ?? '';
      const path = firstLine.split(' ')[1] ?? '/';

      if (path.startsWith('/favicon')) {
        socket.end('HTTP/1.1 404 Not Found\r\nContent-Length: 0\r\nConnection: close\r\n\r\n');
        return;
      }

      const result = parseRedirect(redirectUri + path, redirectUri);
      const status = result?.code ? 'ok' : 'error';

      telemetry.call({
        uri: redirectUri + path,
        method: 'GET',
        title: 'Krok 2: Kód zachycen lokálním HTTP serverem',
        detail: `OIDC přesměrování s kódem (${result?.code ? 'OK' : 'CHYBA'}). Odesílám 302 na ${APP_CALLBACK_URL}`,
        response: { code: result?.code, status: 302 },
        stage: 'auth',
      });

      if (result?.code) {
        resolveCode(result.code);
      } else {
        rejectCode(new Error(`Přihlášení se nezdařilo: ${result?.error ?? 'neznámá chyba'}`));
      }

      socket.end(
        `HTTP/1.1 302 Found\r\nLocation: ${APP_CALLBACK_URL}?status=${status}\r\n` +
          'Content-Length: 0\r\nConnection: close\r\n\r\n'
      );
    });

    socket.on('error', (err: any) => {
      console.warn('Callback server socket error:', err);
    });
  });

  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    // Port 0 = operační systém přidělí volný port. 127.0.0.1 místo "localhost", aby nezkoušel IPv6
    server.listen({ port: 0, host: '127.0.0.1' }, () => resolve());
  });

  const port = server.address()?.port;
  if (!port) {
    throw new Error('Nepodařilo se spustit lokální HTTP server pro zachycení OIDC autorizace');
  }

  redirectUri = `http://127.0.0.1:${port}`;

  return {
    redirectUri,
    code,
    close: () => {
      try {
        server.close();
      } catch {
        // Ignorovat chyby při zavírání
      }
    },
  };
}

/**
 * Provede kompletní přihlášení přes systémový prohlížeč (ASWebAuthenticationSession / Custom Tabs).
 * Vrátí autorizační kód a redirectUri, se kterým byl vydán (nezbytné pro OIDC token_endpoint).
 */
export async function loginWithSystemBrowser(): Promise<{ code: string; redirectUri: string }> {
  const metadata = await getMetadata();
  const server = await startCallbackServer();

  try {
    const authorizeUrl = buildAuthorizeUrl(metadata, server.redirectUri);

    const session = WebBrowser.openAuthSessionAsync(authorizeUrl, APP_CALLBACK_URL).then(
      (result) => {
        // "success" = prohlížeč dokončil přesměrování na studentflow://auth
        if (result.type !== 'success') {
          throw new LoginCancelledError();
        }
        return server.code;
      }
    );

    // Kód z lokálního serveru stačí, i kdyby se okno nezavřelo samo
    const code = await Promise.race([server.code, session]);

    try {
      WebBrowser.dismissAuthSession(); // iOS: zavře session pokud zůstala otevřená
    } catch {
      // Android Custom Tab zavře přesměrování na schéma aplikace
    }

    return { code, redirectUri: server.redirectUri };
  } finally {
    server.close();
  }
}
