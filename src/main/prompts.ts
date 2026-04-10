import type { BrowserWindow } from 'electron';
import type { GameSnapshot } from '../riot.types.js';
import type {
  GameSummary,
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
import { canResolve, resolveTemplate } from './templates.js';

const PROMPT_HISTORY_MAX = 20;
const PROMPT_REPEAT_WINDOW_MS = 300_000; // 5 minutes

type PromptHistoryEntry = {
  text: string;
  category: PromptCategory;
  time: number;
  gameTimeSec: number;
};

let contextState: ContextState = { ...initialContextState };
let cooldownTimer: NodeJS.Timeout;
let inCooldown = false;
let paused = false;
let promptHistory: PromptHistoryEntry[] = [];
let summaryLog: PromptHistoryEntry[] = [];
let lastGameSummary: GameSummary | null = null;

type EngineStatus = 'WAITING_FOR_GAME' | 'ACTIVE';
let engineStatus: EngineStatus = 'WAITING_FOR_GAME';

export type OutputMode = 'overlay' | 'speech' | 'both';
export type EngineTransition = 'game-started' | 'game-ended' | null;

const VALID_OUTPUT_MODES = new Set<OutputMode>(['overlay', 'speech', 'both']);
const configMode = (config as { output_mode?: string }).output_mode;
let outputMode: OutputMode = VALID_OUTPUT_MODES.has(configMode as OutputMode)
  ? (configMode as OutputMode)
  : 'both';

export function getOutputMode(): OutputMode {
  return outputMode;
}

export function cycleOutputMode(): OutputMode {
  const modes: OutputMode[] = ['overlay', 'speech', 'both'];
  const idx = modes.indexOf(outputMode);
  outputMode = modes[(idx + 1) % modes.length]!;
  return outputMode;
}

function sendStateChange(win: BrowserWindow, event: StateChangeEvent) {
  const mode = outputMode;
  if (mode === 'overlay' || mode === 'both') {
    win.webContents.send('state-change', event);
  }
  if ((mode === 'speech' || mode === 'both') && event.state === 'active') {
    win.webContents.send('speak-prompt', event.prompt);
  }
}

function wasRecentlyShown(text: string): boolean {
  const now = Date.now();
  return promptHistory.some(
    (entry) =>
      entry.text === text && now - entry.time < PROMPT_REPEAT_WINDOW_MS,
  );
}

function wasCategoryRecentlyUsed(category: PromptCategory): boolean {
  return promptHistory.length > 0 && promptHistory[0]?.category === category;
}

function recordPrompt(
  text: string,
  category: PromptCategory,
  gameTimeSec: number,
) {
  const entry: PromptHistoryEntry = {
    text,
    category,
    time: Date.now(),
    gameTimeSec,
  };
  promptHistory.unshift(entry);
  if (promptHistory.length > PROMPT_HISTORY_MAX) {
    promptHistory = promptHistory.slice(0, PROMPT_HISTORY_MAX);
  }
  summaryLog.push(entry);
}

function pickPrompt(snapshot: GameSnapshot): string | null {
  const { result, newState } = deriveContext(snapshot, contextState);
  contextState = newState;

  if (!result) return null;
  if (wasCategoryRecentlyUsed(result.category)) return null;

  const pool = prompts[result.category];
  if (!pool || pool.length === 0) return null;

  const resolved = pool
    .filter((template) => canResolve(template, result.data))
    .map((template) => resolveTemplate(template, result.data))
    .filter((text) => !wasRecentlyShown(text));

  if (resolved.length === 0) return null;

  const picked = resolved[Math.floor(Math.random() * resolved.length)]!;
  recordPrompt(picked, result.category, snapshot.gameData.gameTime);
  return picked;
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

function formatGameTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

export function buildGameSummary(
  history: readonly PromptHistoryEntry[],
): GameSummary {
  const categoryMap = new Map<
    PromptCategory,
    { count: number; timestamps: string[] }
  >();

  // Entries are in chronological order (oldest-first)
  for (const entry of history) {
    let bucket = categoryMap.get(entry.category);
    if (!bucket) {
      bucket = { count: 0, timestamps: [] };
      categoryMap.set(entry.category, bucket);
    }
    bucket.count++;
    bucket.timestamps.push(formatGameTime(entry.gameTimeSec));
  }

  const entries = [...categoryMap.entries()].map(([category, data]) => ({
    category,
    count: data.count,
    timestamps: data.timestamps,
  }));

  // Sort by count descending
  entries.sort((a, b) => b.count - a.count);

  return { totalPrompts: history.length, entries };
}

export function getLastGameSummary(): GameSummary | null {
  return lastGameSummary;
}

function resetState() {
  clearTimeout(cooldownTimer);
  inCooldown = false;
  paused = false;
  engineStatus = 'WAITING_FOR_GAME';
  contextState = { ...initialContextState };
  lastGameSummary = buildGameSummary(summaryLog);
  promptHistory = [];
  summaryLog = [];
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
