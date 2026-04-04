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
let cooldownTimer: NodeJS.Timeout;
let inCooldown = false;
let paused = false;

type EngineStatus = 'WAITING_FOR_GAME' | 'ACTIVE';
let engineStatus: EngineStatus = 'WAITING_FOR_GAME';

export type EngineTransition = 'game-started' | 'game-ended' | null;

function sendStateChange(win: BrowserWindow, event: StateChangeEvent) {
  win.webContents.send('state-change', event);
}

function pickPrompt(snapshot: GameSnapshot): string | null {
  const { result, newState } = deriveContext(snapshot, contextState);
  contextState = newState;

  if (!result) return null;
  if (result.category === lastCategory) return null;

  const pool = prompts[result.category];
  if (!pool || pool.length === 0) return null;

  lastCategory = result.category;
  return pool[Math.floor(Math.random() * pool.length)] ?? null;
}

function evaluate(snapshot: GameSnapshot, win: BrowserWindow) {
  if (paused || inCooldown) return;

  const prompt = pickPrompt(snapshot);
  if (!prompt) return;

  sendStateChange(win, { state: 'active', prompt });
  inCooldown = true;

  cooldownTimer = setTimeout(() => {
    sendStateChange(win, { state: 'cooldown' });

    cooldownTimer = setTimeout(() => {
      inCooldown = false;
    }, config.cooldown_ms);
  }, config.active_duration_ms);
}

export function handleServerMessage(
  response: ServerMessage,
  win: BrowserWindow,
): EngineTransition {
  if (response.type === 'FETCH_ERROR') {
    const wasActive = engineStatus === 'ACTIVE';
    resetState();
    return wasActive ? 'game-ended' : null;
  }

  if (engineStatus === 'WAITING_FOR_GAME') {
    engineStatus = 'ACTIVE';
    evaluate(response.payload, win);
    return 'game-started';
  }

  evaluate(response.payload, win);
  return null;
}

function resetState() {
  clearTimeout(cooldownTimer);
  inCooldown = false;
  paused = false;
  engineStatus = 'WAITING_FOR_GAME';
  contextState = { ...initialContextState };
  lastCategory = null;
}

export function stopPromptLoop() {
  resetState();
}

export function togglePromptLoop(win: BrowserWindow) {
  if (paused) {
    paused = false;
  } else {
    clearTimeout(cooldownTimer);
    inCooldown = false;
    sendStateChange(win, { state: 'idle' });
    paused = true;
  }
}
