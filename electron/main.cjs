const { app, BrowserWindow, shell, Menu } = require('electron');
const path = require('node:path');

let mainWindow;

function createWindow() {
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
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  function handleOAuthRedirect(event, url) {
    if (
      url.startsWith('http://localhost:53682') ||
      url.startsWith('studentflow://') ||
      url.includes('studentflow') && url.includes('code=')
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
      mainWindow.focus();
    }
  });

  app.whenReady().then(() => {
    createMenu();
    createWindow();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
