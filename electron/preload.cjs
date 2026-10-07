// Bridge for the page: the desktop share menu (Windows share sheet, macOS share menu).
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('vvDesktop', {
  canShareFiles: ipcRenderer.sendSync('vv-can-share') === true,
  share: (opts) => ipcRenderer.invoke('vv-share', opts)
});
