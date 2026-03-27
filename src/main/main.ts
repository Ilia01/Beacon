import { app, BrowserWindow, globalShortcut, ipcMain, screen } from 'electron';
import Store from 'electron-store';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import config from '../../data/config.json' with { type: 'json' };
import prompts from '../../data/prompts.json' with { type: 'json' };
import {
  type PromptCategory,
  type Position,
  type StateChangeEvent,
} from '../types.js';
import type { GameSnapshot } from '../riot.types.js';
import {
  deriveContext,
  initialContextState,
  type ContextState,
} from './context.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..', '..');

let timerId: NodeJS.Timeout;
let timerRunning = true;

let contextState: ContextState = { ...initialContextState };
let lastCategory: PromptCategory | null = null;

const store = new Store<Position>({
  defaults: {
    x: 0,
    y: 0,
  },
});

function readCurrentSnapshot(): GameSnapshot | null {
  try {
    const raw = fs.readFileSync(path.join(rootDir, 'current.json'), 'utf-8');
    return JSON.parse(raw) as GameSnapshot;
  } catch {
    return null;
  }
}

function sendStateChange(win: BrowserWindow, event: StateChangeEvent) {
  win.webContents.send('state-change', event);
}

function getContextPrompt(): string | null {
  const snapshot = readCurrentSnapshot();
  if (!snapshot) {
    contextState = { ...initialContextState };
    lastCategory = null;
    return null;
  }

  const { result, newState } = deriveContext(snapshot, contextState);
  contextState = newState;

  if (!result) return null;

  if (result.category === lastCategory) return null;

  const pool = prompts[result.category];
  if (!pool || pool.length === 0) return null;

  lastCategory = result.category;
  return pool[Math.floor(Math.random() * pool.length)] ?? null;
}

function handleSetPrompt(win: BrowserWindow) {
  const timeout = Math.floor(
    Math.random() * (config.idle_max_ms - config.idle_min_ms) +
      config.idle_min_ms,
  );

  timerId = setTimeout(() => {
    const prompt = getContextPrompt();

    if (prompt) {
      sendStateChange(win, { state: 'active', prompt });
    }

    timerId = setTimeout(() => {
      if (prompt) {
        sendStateChange(win, { state: 'cooldown' });
      }
      handleSetPrompt(win);
    }, config.active_duration_ms);
  }, timeout);
}

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

  ipcMain.on('set-position', (_event, pos: { dx: number; dy: number }) => {
    const [currentX, currentY] = win.getPosition() as [number, number];
    win.setPosition(currentX + pos.dx, currentY + pos.dy);
  });

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
  }, 16);

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

  // TODO: captures `win` - will break if window is recreated
  globalShortcut.register('CommandOrControl+Shift+M', () => {
    if (timerRunning) {
      clearTimeout(timerId);
      sendStateChange(win, { state: 'idle' });
      timerRunning = false;
    } else {
      handleSetPrompt(win);
      timerRunning = true;
    }
  });

  handleSetPrompt(win);

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
