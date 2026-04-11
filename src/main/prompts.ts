import type { BrowserWindow } from 'electron';
import type { GameSummary, ServerMessage } from '../types.js';
import config from '../../data/config.json' with { type: 'json' };
import prompts from '../../data/prompts.json' with { type: 'json' };
import {
  PromptEngine,
  type EngineTransition,
  type OutputMode,
  type StateChangeSink,
} from './prompt-engine.js';

export type { OutputMode, EngineTransition } from './prompt-engine.js';
export { buildGameSummary } from './prompt-engine.js';

const VALID_OUTPUT_MODES = new Set<OutputMode>(['overlay', 'speech', 'both']);
const configMode = (config as { output_mode?: string }).output_mode;
const initialOutputMode: OutputMode = VALID_OUTPUT_MODES.has(
  configMode as OutputMode,
)
  ? (configMode as OutputMode)
  : 'both';

const engine = new PromptEngine({
  activeDurationMs: config.active_duration_ms,
  cooldownMs: config.cooldown_ms,
  initialOutputMode,
  promptPool: prompts,
});

function sinkFromWindow(win: BrowserWindow): StateChangeSink {
  return {
    sendStateChange(event) {
      if (!win.isDestroyed()) {
        win.webContents.send('state-change', event);
      }
    },
    sendSpeakPrompt(text) {
      if (!win.isDestroyed()) {
        win.webContents.send('speak-prompt', text);
      }
    },
  };
}

export function getOutputMode(): OutputMode {
  return engine.getOutputMode();
}

export function resetOutputMode(): void {
  engine.resetOutputMode();
}

export function cycleOutputMode(): OutputMode {
  return engine.cycleOutputMode();
}

export function handleServerMessage(
  response: ServerMessage,
  win: BrowserWindow,
): EngineTransition {
  return engine.handleServerMessage(response, sinkFromWindow(win));
}

export function getLastGameSummary(): GameSummary | null {
  return engine.getLastGameSummary();
}

export function stopPromptLoop(): void {
  engine.stopPromptLoop();
}

export function togglePromptLoop(win: BrowserWindow): void {
  engine.togglePromptLoop(sinkFromWindow(win));
}
