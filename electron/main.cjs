// NoteVault desktop (Electron). Serves public/ at https://localhost - the same origin as the
// Android app - so mobile-api.js routes /api to the live backend and the backend's existing
// CORS/cookie rules (which allow https://localhost) apply unchanged.
const { app, BrowserWindow, ShareMenu, ipcMain, net, session, shell } = require('electron');
const fs = require('node:fs/promises');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const PUBLIC_DIR = path.join(__dirname, '..', 'public');
const APP_ORIGIN = 'https://localhost';
const SHARE_DIR = path.join(app.getPath('temp'), 'NoteVault-share');

// Windows share sheet (WinRT DataTransferManager); macOS uses Electron's own ShareMenu; Linux has none.
let winShare = null;
if (process.platform === 'win32') {
  try {
    const mod = require('electron-native-share');
    if (mod.canShare()) winShare = mod;
  } catch {
    winShare = null;
  }
}

function canShareFiles() {
  return process.platform === 'darwin' || !!winShare;
}

function shareFileName(name) {
  const clean = path.basename(String(name ?? '')).replace(/[<>:"/\\|?*\x00-\x1f]/g, '_').trim();
  return clean.slice(-120) || 'recording';
}

ipcMain.on('vv-can-share', (e) => {
  e.returnValue = canShareFiles();
});

ipcMain.handle('vv-share', async (e, opts) => {
  if (!e.senderFrame?.url?.startsWith(`${APP_ORIGIN}/`)) throw new Error('Not allowed');
  if (!canShareFiles()) throw new Error('Sharing is not available on this computer.');
  const title = String(opts?.title ?? '').slice(0, 300);
  const text = String(opts?.text ?? '').slice(0, 20000);
  const files = [];
  if (opts?.file?.data) {
    await fs.mkdir(SHARE_DIR, { recursive: true });
    const filePath = path.join(SHARE_DIR, shareFileName(opts.file.name));
    await fs.writeFile(filePath, Buffer.from(opts.file.data));
    files.push(filePath);
  }
  const win = BrowserWindow.fromWebContents(e.sender);
  if (process.platform === 'darwin') {
    const item = {};
    if (files.length) item.filePaths = files;
    if (text) item.texts = [text];
    new ShareMenu(item).popup({ browserWindow: win });
    return 'native';
  }
  const res = await winShare.share(
    { title: title || 'NoteVault', text: text || undefined, files: files.length ? files : undefined },
    win
  );
  return res.method;
});

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
    icon: path.join(__dirname, '..', 'public', 'icons', 'icon-512.png'),
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      preload: path.join(__dirname, 'preload.cjs')
    }
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
  void fs.rm(SHARE_DIR, { recursive: true, force: true }).catch(() => {});
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
