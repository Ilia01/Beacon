import { app, BrowserWindow } from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import config from '../../data/config.json' with { type: 'json' };
import prompts from '../../data/prompts.json' with { type: 'json' };

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..', '..');

const promptArr = Object.values(prompts);

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

function getRandomPrompt() {
  return pickRandom(pickRandom(promptArr));
}

function handleSetPrompt(win: BrowserWindow) {
  const timeout = Math.floor(
    Math.random() * (config.idle_max_ms - config.idle_min_ms) +
      config.idle_min_ms
  );

  setTimeout(() => {
    win.webContents.send('state-change', {
      state: 'active',
      prompt: getRandomPrompt(),
    });

    setTimeout(() => {
      win.webContents.send('state-change', {
        state: 'cooldown',
      });
      handleSetPrompt(win);
    }, config.active_duration_ms);
  }, timeout);
}

const createWindow = () => {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    frame: false,
    transparent: true,
    hasShadow: false,
    movable: true,
    webPreferences: {
      preload: path.join(rootDir, 'dist', 'preload', 'preload.js'),
    },
  });

  win.setAlwaysOnTop(true, 'floating');
  // win.setIgnoreMouseEvents(true);

  win.loadFile(path.join(rootDir, 'src', 'renderer', 'index.html'));
  // win.webContents.openDevTools();

  return win;
};

app.whenReady().then(() => {
  const win = createWindow();

  handleSetPrompt(win);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
