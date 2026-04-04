import type { BrowserWindow } from 'electron';
import type { GameSnapshot } from '../riot.types.js';
import type {
  PromptCategory,
  ServerMessage,
  StateChangeEvent,
} from '../types.js';
import config from '../../data/config.json' with { type: 'json' };
import prompts from '../../data/prompts.json' with { type: 'json' };
import {
  deriveContext,
  initialContextState,
  type ContextState,
} from './context.js';

let contextState: ContextState = { ...initialContextState };
let lastCategory: PromptCategory | null = null;
let timerId: NodeJS.Timeout;
let timerRunning = false;
let latestSnapshot: GameSnapshot | null = null;

type EngineStatus = 'WAITING_FOR_GAME' | 'ACTIVE' | 'COOLDOWN';
let engineStatus: EngineStatus = 'WAITING_FOR_GAME';

export function handleServerMessage(
  response: ServerMessage,
  win: BrowserWindow,
) {
  if (response.type === 'FETCH_ERROR') {
    stopPromptLoop();
    return;
  }

  latestSnapshot = response.payload;

  if (engineStatus === 'WAITING_FOR_GAME') {
    engineStatus = 'ACTIVE';
    startPromptLoop(win);
  }
}

function pickPrompt(): string | null {
  if (!latestSnapshot) {
    contextState = { ...initialContextState };
    lastCategory = null;
    return null;
  }

  const { result, newState } = deriveContext(latestSnapshot, contextState);
  contextState = newState;

  if (!result) return null;
  if (result.category === lastCategory) return null;

  const pool = prompts[result.category];
  if (!pool || pool.length === 0) return null;

  lastCategory = result.category;
  return pool[Math.floor(Math.random() * pool.length)] ?? null;
}

function sendStateChange(win: BrowserWindow, event: StateChangeEvent) {
  win.webContents.send('state-change', event);
}

function scheduleNext(win: BrowserWindow) {
  const timeout = Math.floor(
    Math.random() * (config.idle_max_ms - config.idle_min_ms) +
      config.idle_min_ms,
  );

  timerId = setTimeout(() => {
    const prompt = pickPrompt();

    if (prompt) {
      sendStateChange(win, { state: 'active', prompt });
    }

    timerId = setTimeout(() => {
      if (prompt) {
        sendStateChange(win, { state: 'cooldown' });
      }
      scheduleNext(win);
    }, config.active_duration_ms);
  }, timeout);
}

export function startPromptLoop(win: BrowserWindow) {
  if (timerRunning) return;
  timerRunning = true;
  scheduleNext(win);
}

export function stopPromptLoop() {
  clearTimeout(timerId);
  timerRunning = false;
  engineStatus = 'WAITING_FOR_GAME';
  latestSnapshot = null;
  contextState = { ...initialContextState };
  lastCategory = null;
}

export function togglePromptLoop(win: BrowserWindow) {
  if (timerRunning) {
    clearTimeout(timerId);
    sendStateChange(win, { state: 'idle' });
    timerRunning = false;
  } else {
    startPromptLoop(win);
  }
}
