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

const { app, BrowserWindow, shell, Menu } = electronPkg;
const path = require('node:path');
const http = require('node:http');
const fs = require('node:fs');

let mainWindow;
let localStaticServer;
let localServerPort = 0;

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
        const filePath = path.join(distDir, pathname);

        if (!filePath.startsWith(distDir)) {
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
      const distDir = path.join(__dirname, '../dist');
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
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
