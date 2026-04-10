import {
  app,
  BrowserWindow,
  globalShortcut,
  ipcMain,
  safeStorage,
  screen,
  utilityProcess,
} from 'electron';
import Store from 'electron-store';
import { setGroqApiKey, clearGroqApiKey } from './coach.js';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { AppStore } from '../types.js';
import {
  cycleOutputMode,
  handleServerMessage,
  stopPromptLoop,
  togglePromptLoop,
} from './prompts.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..', '..');
const preloadPath = path.join(rootDir, 'dist', 'preload', 'preload.js');

const store = new Store<AppStore>({
  defaults: {
    x: 0,
    y: 0,
  },
});

const createHubWindow = () => {
  const win = new BrowserWindow({
    width: 380,
    height: 420,
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

  ipcMain.handle('has-api-key', () => {
    const encrypted = store.get('groqApiKey') as string | undefined;
    if (!encrypted) return false;
    try {
      if (!safeStorage.isEncryptionAvailable()) return false;
      safeStorage.decryptString(Buffer.from(encrypted, 'base64'));
      return true;
    } catch {
      return false;
    }
  });

  ipcMain.handle('set-api-key', (_event, key: string) => {
    if (key) {
      if (!safeStorage.isEncryptionAvailable()) {
        throw new Error('Encryption unavailable on this system');
      }
      try {
        const encrypted = safeStorage.encryptString(key).toString('base64');
        store.set('groqApiKey', encrypted);
        setGroqApiKey(key);
      } catch {
        throw new Error('Failed to encrypt API key');
      }
    } else {
      store.delete('groqApiKey');
      clearGroqApiKey();
    }
  });

  // Load saved key on startup
  const savedKey = store.get('groqApiKey') as string | undefined;
  if (savedKey) {
    try {
      if (safeStorage.isEncryptionAvailable()) {
        const decrypted = safeStorage.decryptString(
          Buffer.from(savedKey, 'base64'),
        );
        setGroqApiKey(decrypted);
      }
    } catch {
      // corrupted or unreadable key — remove it so the user can re-enter
      store.delete('groqApiKey');
    }
  }

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
