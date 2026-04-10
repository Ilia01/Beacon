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
  cycleOutputMode,
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

  const hitTestInterval = setInterval(() => {
    if (!win.isVisible()) return;

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

  win.on('closed', () => {
    clearInterval(hitTestInterval);
  });

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
  let lastAppStatus: 'waiting' | 'connected' | 'error' = 'waiting';

  ipcMain.handle('get-version', () => app.getVersion());

  ipcMain.on('set-position', (_event, pos: { dx: number; dy: number }) => {
    const [currentX, currentY] = overlay.getPosition() as [number, number];
    overlay.setPosition(currentX + pos.dx, currentY + pos.dy);
  });

  server.on('message', (response) => {
    const transition = handleServerMessage(response, overlay);

    if (transition === 'game-started') {
      lastAppStatus = 'connected';
      hub.webContents.send('app-status', { status: 'connected' });
      hub.hide();
      overlay.show();
    } else if (transition === 'game-ended') {
      lastAppStatus = 'waiting';
      overlay.hide();
      hub.show();
      hub.webContents.send('app-status', { status: 'waiting' });
    } else if (
      typeof transition === 'object' &&
      transition !== null &&
      transition.type === 'error'
    ) {
      lastAppStatus = 'error';
      stopPromptLoop();
      overlay.hide();
      hub.show();
      hub.webContents.send('app-status', {
        status: 'error',
        reason: transition.reason,
      });
    }
  });

  server.on('exit', () => {
    stopPromptLoop();
    overlay.hide();
    hub.show();
    if (lastAppStatus !== 'error') {
      hub.webContents.send('app-status', { status: 'waiting' });
    }
  });

  globalShortcut.register('CommandOrControl+Shift+M', () => {
    togglePromptLoop(overlay);
  });

  globalShortcut.register('CommandOrControl+Shift+S', () => {
    const mode = cycleOutputMode();
    // Intentionally bypasses sendStateChange so the mode confirmation is
    // always shown as overlay text, even in speech-only mode. Without this,
    // switching to speech-only would only announce the change via speech
    // with no visual feedback.
    overlay.webContents.send('state-change', {
      state: 'active',
      prompt: `Output: ${mode}`,
    });
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
