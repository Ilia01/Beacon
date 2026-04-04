import {
  app,
  BrowserWindow,
  globalShortcut,
  ipcMain,
  screen,
  utilityProcess,
} from 'electron';
import Store from 'electron-store';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Position } from '../types.js';
import {
  handleServerMessage,
  stopPromptLoop,
  togglePromptLoop,
} from './prompts.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..', '..');
const preloadPath = path.join(rootDir, 'dist', 'preload', 'preload.js');

const store = new Store<Position>({
  defaults: {
    x: 0,
    y: 0,
  },
});

const createHubWindow = () => {
  const win = new BrowserWindow({
    width: 380,
    height: 320,
    frame: false,
    resizable: false,
    transparent: true,
    hasShadow: true,
    center: true,
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  win.setVisibleOnAllWorkspaces(true);

  win.loadFile(path.join(rootDir, 'src', 'renderer', 'hub.html'));

  return win;
};

const createOverlayWindow = () => {
  const win = new BrowserWindow({
    width: 600,
    height: 60,
    frame: false,
    resizable: false,
    transparent: true,
    hasShadow: false,
    show: false,
    x: store.get('x'),
    y: store.get('y'),
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  win.setAlwaysOnTop(true, 'screen-saver');

  win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });

  setInterval(() => {
    const cursor = screen.getCursorScreenPoint();
    const rect = win.getBounds();

    if (
      cursor.x >= rect.x &&
      cursor.x <= rect.x + rect.width &&
      cursor.y >= rect.y &&
      cursor.y <= rect.y + rect.height
    ) {
      win.setIgnoreMouseEvents(false);
    } else {
      win.setIgnoreMouseEvents(true);
    }
  }, 100);

  win.on('moved', () => {
    const [x, y] = win.getPosition();

    store.set('x', x);
    store.set('y', y);
  });

  win.loadFile(path.join(rootDir, 'src', 'renderer', 'index.html'));

  return win;
};

app.whenReady().then(() => {
  let hub = createHubWindow();
  let overlay = createOverlayWindow();
  const server = utilityProcess.fork(path.join(__dirname, 'server.js'));

  ipcMain.on('set-position', (_event, pos: { dx: number; dy: number }) => {
    const [currentX, currentY] = overlay.getPosition() as [number, number];
    overlay.setPosition(currentX + pos.dx, currentY + pos.dy);
  });

  server.on('message', (response) => {
    const transition = handleServerMessage(response, overlay);

    if (transition === 'game-started') {
      hub.webContents.send('app-status', { status: 'connected' });
      hub.hide();
      overlay.show();
    } else if (transition === 'game-ended') {
      overlay.hide();
      hub.show();
      hub.webContents.send('app-status', { status: 'waiting' });
    }
  });

  server.on('exit', () => {
    stopPromptLoop();
    overlay.hide();
    hub.show();
    hub.webContents.send('app-status', { status: 'waiting' });
  });

  globalShortcut.register('CommandOrControl+Shift+M', () => {
    togglePromptLoop(overlay);
  });

  app.on('before-quit', () => {
    server.kill();
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      hub = createHubWindow();
      overlay = createOverlayWindow();
    }
  });
});

app.on('window-all-closed', () => {
  globalShortcut.unregisterAll();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
