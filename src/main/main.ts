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
import { handleServerMessage, togglePromptLoop } from './prompts.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..', '..');

const store = new Store<Position>({
  defaults: {
    x: 0,
    y: 0,
  },
});

const createWindow = () => {
  const win = new BrowserWindow({
    width: 600,
    height: 60,
    frame: false,
    resizable: false,
    transparent: true,
    hasShadow: false,
    x: store.get('x'),
    y: store.get('y'),
    webPreferences: {
      preload: path.join(rootDir, 'dist', 'preload', 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  win.setAlwaysOnTop(true, 'floating');
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

  if (!app.isPackaged) {
    const width = 1280;
    const height = 600;

    win.webContents.openDevTools();
    win.setSize(width, height);
  }

  return win;
};

app.whenReady().then(() => {
  const win = createWindow();
  const server = utilityProcess.fork(path.join(rootDir, 'server.js'));

  ipcMain.on('set-position', (_event, pos: { dx: number; dy: number }) => {
    const [currentX, currentY] = win.getPosition() as [number, number];
    win.setPosition(currentX + pos.dx, currentY + pos.dy);
  });

  server.on('message', (response) => {
    handleServerMessage(response, win);
  });

  globalShortcut.register('CommandOrControl+Shift+M', () => {
    togglePromptLoop(win);
  });

  app.on('before-quit', () => {
    server.kill();
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  globalShortcut.unregisterAll();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
