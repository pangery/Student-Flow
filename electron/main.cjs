// If executed by Node directly or inside an environment where ELECTRON_RUN_AS_NODE=1 is inherited,
// re-spawn with the real Electron runtime.
const electronPkg = require('electron');
if (typeof electronPkg === 'string') {
  const { spawn } = require('node:child_process');
  const cleanEnv = { ...process.env };
  delete cleanEnv.ELECTRON_RUN_AS_NODE;
  const child = spawn(electronPkg, [__filename, ...process.argv.slice(2)], {
    env: cleanEnv,
    stdio: 'inherit',
  });
  child.on('exit', (code) => process.exit(code ?? 0));
  return;
}

const { app, BrowserWindow, shell, Menu, session, ipcMain } = electronPkg;
const path = require('node:path');
const http = require('node:http');
const fs = require('node:fs');

let mainWindow;
let localStaticServer;
let localServerPort = 0;
let oauthCallbackServer;

const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ttf': 'font/ttf',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

function startLocalStaticServer(distDir) {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      try {
        const parsedUrl = new URL(req.url, 'http://127.0.0.1');
        let pathname = decodeURIComponent(parsedUrl.pathname);
        if (pathname === '/') pathname = '/index.html';
        const normalizedDist = path.resolve(distDir);
        const filePath = path.resolve(normalizedDist, '.' + pathname);
        const rel = path.relative(normalizedDist, filePath);

        if (rel.startsWith('..') || path.isAbsolute(rel)) {
          res.statusCode = 403;
          return res.end('Forbidden');
        }

        fs.stat(filePath, (err, stats) => {
          if (err || !stats.isFile()) {
            // SPA fallback: return index.html
            fs.readFile(path.join(distDir, 'index.html'), (err2, data) => {
              if (err2) {
                res.statusCode = 404;
                return res.end('Not found');
              }
              res.setHeader('Content-Type', 'text/html; charset=utf-8');
              res.end(data);
            });
            return;
          }

          const ext = path.extname(filePath).toLowerCase();
          const contentType = MIME_TYPES[ext] || 'application/octet-stream';
          res.setHeader('Content-Type', contentType);
          fs.createReadStream(filePath).pipe(res);
        });
      } catch (e) {
        res.statusCode = 500;
        res.end('Server error');
      }
    });

    server.listen(0, '127.0.0.1', () => {
      const port = server.address().port;
      resolve({ port, server });
    });

    server.on('error', reject);
  });
}

function startOAuthCallbackServer() {
  const server = http.createServer((req, res) => {
    try {
      const parsedUrl = new URL(req.url, 'http://localhost:53682');
      const code = parsedUrl.searchParams.get('code');
      if (code) {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('oauth-code', code);
          if (mainWindow.isMinimized()) mainWindow.restore();
          mainWindow.show();
          mainWindow.focus();
          if (process.platform === 'darwin' && app.dock) {
            app.dock.show();
            app.focus({ steal: true });
          }
        }
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.end(`
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <title>Přihlášení úspěšné</title>
              <style>
                body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0F172A; color: #FFFFFF; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; text-align: center; }
                .card { background: #1E293B; padding: 40px; border-radius: 16px; border: 1px solid rgba(255,255,255,0.1); max-width: 420px; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5); }
                h1 { font-size: 22px; color: #38BDF8; margin-bottom: 12px; }
                p { color: #94A3B8; font-size: 15px; margin: 0; line-height: 1.5; }
              </style>
            </head>
            <body>
              <div class="card">
                <h1>✓ Přihlášení proběhlo úspěšně</h1>
                <p>Můžete toto okno zavřít a pokračovat v aplikaci StudentFlow.</p>
              </div>
              <script>setTimeout(() => window.close(), 1200);</script>
            </body>
          </html>
        `);
        return;
      }
    } catch (e) {
      console.error('Error handling OAuth callback request', e);
    }
    res.statusCode = 404;
    res.end('Not found');
  });

  server.listen(53682, '127.0.0.1', () => {
    // Port 53682 listening for Plus4U OIDC redirects
  });

  server.on('error', (err) => {
    if (err.code !== 'EADDRINUSE') {
      console.warn('OAuth callback server warning:', err);
    }
  });

  return server;
}

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 820,
    minWidth: 840,
    minHeight: 600,
    title: 'StudentFlow',
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    backgroundColor: '#0F172A',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false,
    },
  });

  const isDev = process.argv.includes('--dev');
  if (isDev) {
    mainWindow.loadURL('http://localhost:8081');
  } else {
    if (!localServerPort) {
      const distDir = path.resolve(__dirname, '../dist');
      const { port, server } = await startLocalStaticServer(distDir);
      localServerPort = port;
      localStaticServer = server;
    }
    mainWindow.loadURL(`http://127.0.0.1:${localServerPort}/index.html`);
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.focus();
    if (process.platform === 'darwin' && app.dock) {
      app.dock.show();
      app.focus({ steal: true });
    }
  });

  function handleOAuthRedirect(event, url) {
    if (
      url.startsWith('http://localhost:53682') ||
      url.startsWith('studentflow://') ||
      (url.includes('studentflow') && url.includes('code='))
    ) {
      event.preventDefault();
      try {
        const parsed = new URL(url);
        const code = parsed.searchParams.get('code');
        if (code && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('oauth-code', code);
        }
      } catch (err) {
        console.error('Failed to parse OAuth redirect URL', err);
      }
    }
  }

  mainWindow.webContents.on('will-navigate', (event, url) => {
    handleOAuthRedirect(event, url);
  });

  mainWindow.webContents.on('will-redirect', (event, url) => {
    handleOAuthRedirect(event, url);
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (
      url.includes('plus4u.net') ||
      url.includes('unicorn.com') ||
      url.includes('localhost')
    ) {
      return { action: 'allow' };
    }
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function createMenu() {
  const isMac = process.platform === 'darwin';
  const template = [
    ...(isMac
      ? [
          {
            label: app.name,
            submenu: [
              { role: 'about' },
              { type: 'separator' },
              { role: 'services' },
              { type: 'separator' },
              { role: 'hide' },
              { role: 'hideOthers' },
              { role: 'unhide' },
              { type: 'separator' },
              { role: 'quit' },
            ],
          },
        ]
      : []),
    {
      label: 'Soubor',
      submenu: [isMac ? { role: 'close' } : { role: 'quit' }],
    },
    {
      label: 'Úpravy',
      submenu: [
        { role: 'undo', label: 'Zpět' },
        { role: 'redo', label: 'Znovu' },
        { type: 'separator' },
        { role: 'cut', label: 'Vyjmout' },
        { role: 'copy', label: 'Kopírovat' },
        { role: 'paste', label: 'Vložit' },
        { role: 'selectAll', label: 'Vybrat vše' },
      ],
    },
    {
      label: 'Zobrazení',
      submenu: [
        { role: 'reload', label: 'Obnovit' },
        { role: 'forceReload', label: 'Vynutit obnovení' },
        { role: 'toggleDevTools', label: 'Vývojářské nástroje' },
        { type: 'separator' },
        { role: 'resetZoom', label: 'Výchozí velikost' },
        { role: 'zoomIn', label: 'Zvětšit' },
        { role: 'zoomOut', label: 'Zmenšit' },
        { type: 'separator' },
        { role: 'togglefullscreen', label: 'Celá obrazovka' },
      ],
    },
    {
      label: 'Okno',
      submenu: [
        { role: 'minimize', label: 'Minimalizovat' },
        { role: 'zoom', label: 'Maximalizovat' },
        ...(isMac
          ? [
              { type: 'separator' },
              { role: 'front', label: 'Přenést do popředí' },
            ]
          : []),
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
      if (process.platform === 'darwin') {
        app.focus({ steal: true });
      }
    }
  });

  app.whenReady().then(async () => {
    // 1. Strip headers preventing Plus4U from being embedded in iframes
    session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
      const responseHeaders = { ...details.responseHeaders };
      for (const key of Object.keys(responseHeaders)) {
        const lower = key.toLowerCase();
        if (
          lower === 'x-frame-options' ||
          lower === 'content-security-policy' ||
          lower === 'content-security-policy-report-only'
        ) {
          delete responseHeaders[key];
        }
      }
      callback({ cancel: false, responseHeaders });
    });

    // 2. Intercept OAuth redirect URLs across all frames and windows
    session.defaultSession.webRequest.onBeforeRequest((details, callback) => {
      const url = details.url;
      if (
        url.startsWith('http://localhost:53682') ||
        url.startsWith('studentflow://') ||
        (url.includes('studentflow') && url.includes('code='))
      ) {
        try {
          const parsed = new URL(url);
          const code = parsed.searchParams.get('code');
          if (code && mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('oauth-code', code);
          }
        } catch (err) {
          console.error('Failed to parse OAuth redirect URL', err);
        }
        callback({ cancel: true });
        return;
      }
      callback({ cancel: false });
    });

    // 3. Start localhost:53682 listener for system browser logins
    oauthCallbackServer = startOAuthCallbackServer();

    // 4. Register IPC handlers
    ipcMain.on('open-external', (_event, url) => {
      if (url) shell.openExternal(url);
    });

    createMenu();
    await createWindow();

    app.on('activate', async () => {
      if (BrowserWindow.getAllWindows().length === 0) await createWindow();
    });
  });
}

app.on('window-all-closed', () => {
  if (localStaticServer) {
    localStaticServer.close();
  }
  if (oauthCallbackServer) {
    oauthCallbackServer.close();
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
