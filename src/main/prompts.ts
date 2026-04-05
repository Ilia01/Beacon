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
import { canResolve, resolveTemplate } from './templates.js';
import { rephrasePrompt, resetCoachHistory } from './coach.js';
import { getGamePhase } from './phases.js';

const PROMPT_HISTORY_MAX = 20;
const PROMPT_REPEAT_WINDOW_MS = 300_000; // 5 minutes

type PromptHistoryEntry = {
  text: string;
  category: PromptCategory;
  time: number;
};

let contextState: ContextState = { ...initialContextState };
let cooldownTimer: NodeJS.Timeout;
let inCooldown = false;
let paused = false;
let promptHistory: PromptHistoryEntry[] = [];

type EngineStatus = 'WAITING_FOR_GAME' | 'ACTIVE';
let engineStatus: EngineStatus = 'WAITING_FOR_GAME';

export type OutputMode = 'overlay' | 'speech' | 'both';
export type EngineTransition = 'game-started' | 'game-ended' | null;

const VALID_OUTPUT_MODES = new Set<OutputMode>(['overlay', 'speech', 'both']);
const configMode = (config as { output_mode?: string }).output_mode;
let outputMode: OutputMode = VALID_OUTPUT_MODES.has(configMode as OutputMode)
  ? (configMode as OutputMode)
  : 'both';

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

function recordPrompt(text: string, category: PromptCategory) {
  promptHistory.unshift({ text, category, time: Date.now() });
  if (promptHistory.length > PROMPT_HISTORY_MAX) {
    promptHistory = promptHistory.slice(0, PROMPT_HISTORY_MAX);
  }
}

function pickTemplateFallback(
  category: PromptCategory,
  data: Record<string, string>,
): string | null {
  const pool = prompts[category];
  if (!pool || pool.length === 0) return null;

  const resolved = pool
    .filter((template) => canResolve(template, data))
    .map((template) => resolveTemplate(template, data))
    .filter((text) => !wasRecentlyShown(text));

  if (resolved.length === 0) return null;
  return resolved[Math.floor(Math.random() * resolved.length)]!;
}

async function pickPrompt(snapshot: GameSnapshot): Promise<string | null> {
  const { result, newState } = deriveContext(snapshot, contextState);
  contextState = newState;

  if (!result) return null;
  if (wasCategoryRecentlyUsed(result.category)) return null;

  const basePrompt = pickTemplateFallback(result.category, result.data);
  if (!basePrompt) return null;

  // Try to rephrase with LLM, fall back to raw template
  const phase = getGamePhase(snapshot.gameData.gameTime);
  const rephrased = await rephrasePrompt(basePrompt, snapshot, phase);

  const picked =
    rephrased && !wasRecentlyShown(rephrased) ? rephrased : basePrompt;

  if (wasRecentlyShown(picked)) return null;

  recordPrompt(picked, result.category);
  return picked;
}

async function evaluate(snapshot: GameSnapshot, win: BrowserWindow) {
  if (paused || inCooldown) return;
  inCooldown = true;

  const prompt = await pickPrompt(snapshot);
  if (!prompt) {
    inCooldown = false;
    return;
  }

  sendStateChange(win, { state: 'active', prompt });

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
  promptHistory = [];
  resetCoachHistory();
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
