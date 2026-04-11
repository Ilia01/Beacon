import type { GameSnapshot } from '../riot.types.js';
import type {
  GameSummary,
  PromptCategory,
  ServerMessage,
  StateChangeEvent,
} from '../types.js';
import {
  deriveContext,
  initialContextState,
  type ContextState,
} from './context.js';
import { canResolve, resolveTemplate } from './templates.js';

const PROMPT_HISTORY_MAX = 20;
const PROMPT_REPEAT_WINDOW_MS = 300_000; // 5 minutes

export type PromptHistoryEntry = {
  text: string;
  category: PromptCategory;
  time: number;
  gameTimeSec: number;
};

export type OutputMode = 'overlay' | 'speech' | 'both';
export type EngineTransition =
  | 'game-started'
  | 'game-ended'
  | { type: 'error'; reason: string }
  | null;
type EngineStatus = 'WAITING_FOR_GAME' | 'ACTIVE';

/** Abstraction for sending state change events to the renderer. */
export interface StateChangeSink {
  sendStateChange(event: StateChangeEvent): void;
  sendSpeakPrompt(text: string): void;
}

export type PromptEngineConfig = {
  activeDurationMs: number;
  cooldownMs: number;
  initialOutputMode: OutputMode;
  promptPool: Record<string, readonly string[]>;
};

export class PromptEngine {
  private contextState: ContextState = { ...initialContextState };
  private cooldownTimer: ReturnType<typeof setTimeout> | null = null;
  private inCooldown = false;
  private paused = false;
  private promptHistory: PromptHistoryEntry[] = [];
  private summaryLog: PromptHistoryEntry[] = [];
  private lastGameSummary: GameSummary | null = null;
  private engineStatus: EngineStatus = 'WAITING_FOR_GAME';
  private outputMode: OutputMode;
  private readonly initialOutputMode: OutputMode;
  private readonly config: PromptEngineConfig;

  constructor(config: PromptEngineConfig) {
    this.config = config;
    this.initialOutputMode = config.initialOutputMode;
    this.outputMode = config.initialOutputMode;
  }

  // ── Output mode ──────────────────────────────────────────────

  getOutputMode(): OutputMode {
    return this.outputMode;
  }

  resetOutputMode(): void {
    this.outputMode = this.initialOutputMode;
  }

  cycleOutputMode(): OutputMode {
    const modes: OutputMode[] = ['overlay', 'speech', 'both'];
    const idx = modes.indexOf(this.outputMode);
    this.outputMode = modes[(idx + 1) % modes.length]!;
    return this.outputMode;
  }

  // ── State queries (for testing) ──────────────────────────────

  isPaused(): boolean {
    return this.paused;
  }

  isInCooldown(): boolean {
    return this.inCooldown;
  }

  getEngineStatus(): EngineStatus {
    return this.engineStatus;
  }

  getLastGameSummary(): GameSummary | null {
    return this.lastGameSummary;
  }

  // ── Core logic ───────────────────────────────────────────────

  handleServerMessage(
    response: ServerMessage,
    sink: StateChangeSink,
  ): EngineTransition {
    if (response.type === 'FETCH_ERROR') {
      if (response.errorCategory === 'game_not_running') {
        const wasActive = this.engineStatus === 'ACTIVE';
        this.resetState();
        return wasActive ? 'game-ended' : null;
      }

      this.resetState();
      return { type: 'error', reason: response.reason };
    }

    if (this.engineStatus === 'WAITING_FOR_GAME') {
      this.engineStatus = 'ACTIVE';
      this.evaluate(response.payload, sink);
      return 'game-started';
    }

    this.evaluate(response.payload, sink);
    return null;
  }

  togglePromptLoop(sink: StateChangeSink): void {
    if (this.paused) {
      this.paused = false;
    } else {
      this.clearCooldownTimer();
      this.inCooldown = false;
      this.dispatchStateChange(sink, { state: 'idle' });
      this.paused = true;
    }
  }

  stopPromptLoop(): void {
    this.resetState();
  }

  /** Clears all timers. Call when the engine is no longer needed. */
  dispose(): void {
    this.clearCooldownTimer();
  }

  // ── Private helpers ──────────────────────────────────────────

  private clearCooldownTimer(): void {
    if (this.cooldownTimer !== null) {
      clearTimeout(this.cooldownTimer);
      this.cooldownTimer = null;
    }
  }

  private dispatchStateChange(
    sink: StateChangeSink,
    event: StateChangeEvent,
  ): void {
    const mode = this.outputMode;
    if (mode === 'overlay' || mode === 'both') {
      sink.sendStateChange(event);
    }
    if ((mode === 'speech' || mode === 'both') && event.state === 'active') {
      sink.sendSpeakPrompt(event.prompt);
    }
  }

  private wasRecentlyShown(text: string): boolean {
    const now = Date.now();
    return this.promptHistory.some(
      (entry) =>
        entry.text === text && now - entry.time < PROMPT_REPEAT_WINDOW_MS,
    );
  }

  private wasCategoryRecentlyUsed(category: PromptCategory): boolean {
    return (
      this.promptHistory.length > 0 &&
      this.promptHistory[0]?.category === category
    );
  }

  private recordPrompt(
    text: string,
    category: PromptCategory,
    gameTimeSec: number,
  ): void {
    const entry: PromptHistoryEntry = {
      text,
      category,
      time: Date.now(),
      gameTimeSec,
    };
    this.promptHistory.unshift(entry);
    if (this.promptHistory.length > PROMPT_HISTORY_MAX) {
      this.promptHistory = this.promptHistory.slice(0, PROMPT_HISTORY_MAX);
    }
    this.summaryLog.push(entry);
  }

  private pickPrompt(snapshot: GameSnapshot): string | null {
    const { result, newState } = deriveContext(snapshot, this.contextState);
    this.contextState = newState;

    if (!result) return null;
    if (this.wasCategoryRecentlyUsed(result.category)) return null;

    const pool = this.config.promptPool[result.category];
    if (!pool || pool.length === 0) return null;

    const resolved = (pool as readonly string[])
      .filter((template) => canResolve(template, result.data))
      .map((template) => resolveTemplate(template, result.data))
      .filter((text) => !this.wasRecentlyShown(text));

    if (resolved.length === 0) return null;

    const picked = resolved[Math.floor(Math.random() * resolved.length)]!;
    this.recordPrompt(picked, result.category, snapshot.gameData.gameTime);
    return picked;
  }

  private evaluate(snapshot: GameSnapshot, sink: StateChangeSink): void {
    if (this.paused || this.inCooldown) return;

    const prompt = this.pickPrompt(snapshot);
    if (!prompt) return;

    this.dispatchStateChange(sink, { state: 'active', prompt });
    this.inCooldown = true;

    this.cooldownTimer = setTimeout(() => {
      this.dispatchStateChange(sink, { state: 'cooldown' });

      this.cooldownTimer = setTimeout(() => {
        this.inCooldown = false;
        this.cooldownTimer = null;
      }, this.config.cooldownMs);
    }, this.config.activeDurationMs);
  }

  private resetState(): void {
    this.clearCooldownTimer();
    this.inCooldown = false;
    this.paused = false;
    this.engineStatus = 'WAITING_FOR_GAME';
    this.contextState = { ...initialContextState };
    this.lastGameSummary = buildGameSummary(this.summaryLog);
    this.promptHistory = [];
    this.summaryLog = [];
  }
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

  entries.sort((a, b) => b.count - a.count);

  return { totalPrompts: history.length, entries };
}
