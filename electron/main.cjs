// NoteVault desktop (Electron). Serves public/ at https://localhost - the same origin as the
// Android app - so mobile-api.js routes /api to the live backend and the backend's existing
// CORS/cookie rules (which allow https://localhost) apply unchanged.
const { app, BrowserWindow, net, session, shell } = require('electron');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const PUBLIC_DIR = path.join(__dirname, '..', 'public');
const APP_ORIGIN = 'https://localhost';

async function serveLocal(url) {
  const rel = decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname);
  const filePath = path.normalize(path.join(PUBLIC_DIR, rel));
  if (!filePath.startsWith(PUBLIC_DIR + path.sep)) return new Response('Not found', { status: 404 });
  try {
    return await net.fetch(pathToFileURL(filePath).toString());
  } catch {
    return new Response('Not found', { status: 404 });
  }
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1100,
    height: 820,
    title: 'NoteVault',
    backgroundColor: '#f4efe4',
    webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true }
  });
  win.setMenuBarVisibility(false);
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (!url.startsWith(APP_ORIGIN)) void shell.openExternal(url);
    return { action: 'deny' };
  });
  if (!app.isPackaged) {
    win.webContents.on('console-message', (e) => {
      console.log(`[renderer:${e.level}] ${e.message} (${e.sourceId}:${e.lineNumber})`);
    });
  }
  win.loadURL(`${APP_ORIGIN}/`);
  return win;
}

app.whenReady().then(() => {
  session.defaultSession.protocol.handle('https', (request) => {
    const url = new URL(request.url);
    if (url.host === 'localhost') return serveLocal(url);
    return net.fetch(request, { bypassCustomProtocolHandlers: true });
  });
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
