const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  onOAuthCode: (callback) => {
    const handler = (_event, code) => callback(code);
    ipcRenderer.on('oauth-code', handler);
    return () => ipcRenderer.removeListener('oauth-code', handler);
  },
  openExternal: (url) => {
    ipcRenderer.send('open-external', url);
  },
});
