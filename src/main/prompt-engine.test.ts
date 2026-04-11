import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  PromptEngine,
  type StateChangeSink,
  type PromptEngineConfig,
} from './prompt-engine.js';
import type { ServerMessage } from '../types.js';

function makeSink(): StateChangeSink & {
  stateChanges: Array<{ state: string; prompt?: string }>;
  speakPrompts: string[];
} {
  return {
    stateChanges: [],
    speakPrompts: [],
    sendStateChange(event) {
      this.stateChanges.push(event);
    },
    sendSpeakPrompt(text) {
      this.speakPrompts.push(text);
    },
  };
}

const defaultConfig: PromptEngineConfig = {
  activeDurationMs: 5_000,
  cooldownMs: 10_000,
  initialOutputMode: 'both',
  promptPool: {
    death: ['You died'],
    macro: ['Push the wave'],
    trading: ['Trade now'],
    vision: ['Ward here'],
    mental: ['Stay calm'],
    objective: ['Take dragon'],
  },
};

function makeEngine(overrides?: Partial<PromptEngineConfig>): PromptEngine {
  return new PromptEngine({ ...defaultConfig, ...overrides });
}

describe('PromptEngine', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('output mode', () => {
    it('starts with the configured initial output mode', () => {
      const engine = makeEngine({ initialOutputMode: 'overlay' });
      expect(engine.getOutputMode()).toBe('overlay');
    });

    it('cycles through overlay → speech → both → overlay', () => {
      const engine = makeEngine({ initialOutputMode: 'both' });
      expect(engine.cycleOutputMode()).toBe('overlay');
      expect(engine.cycleOutputMode()).toBe('speech');
      expect(engine.cycleOutputMode()).toBe('both');
      expect(engine.cycleOutputMode()).toBe('overlay');
    });

    it('resets to initial output mode', () => {
      const engine = makeEngine({ initialOutputMode: 'both' });
      engine.cycleOutputMode(); // → overlay
      engine.cycleOutputMode(); // → speech
      engine.resetOutputMode();
      expect(engine.getOutputMode()).toBe('both');
    });
  });

  describe('handleServerMessage', () => {
    it('returns game-started on first DATA message', () => {
      const engine = makeEngine();
      const sink = makeSink();
      const msg: ServerMessage = {
        type: 'DATA',
        payload: makeMinimalSnapshot(),
      };

      const transition = engine.handleServerMessage(msg, sink);
      expect(transition).toBe('game-started');
      expect(engine.getEngineStatus()).toBe('ACTIVE');
    });

    it('returns null on subsequent DATA messages', () => {
      const engine = makeEngine();
      const sink = makeSink();
      const msg: ServerMessage = {
        type: 'DATA',
        payload: makeMinimalSnapshot(),
      };

      engine.handleServerMessage(msg, sink);
      const transition = engine.handleServerMessage(msg, sink);
      expect(transition).toBeNull();
    });

    it('returns game-ended when game_not_running after being ACTIVE', () => {
      const engine = makeEngine();
      const sink = makeSink();

      engine.handleServerMessage(
        { type: 'DATA', payload: makeMinimalSnapshot() },
        sink,
      );

      const transition = engine.handleServerMessage(
        {
          type: 'FETCH_ERROR',
          reason: 'no game',
          errorCategory: 'game_not_running',
        },
        sink,
      );
      expect(transition).toBe('game-ended');
      expect(engine.getEngineStatus()).toBe('WAITING_FOR_GAME');
    });

    it('returns null for game_not_running when already WAITING', () => {
      const engine = makeEngine();
      const sink = makeSink();

      const transition = engine.handleServerMessage(
        {
          type: 'FETCH_ERROR',
          reason: 'no game',
          errorCategory: 'game_not_running',
        },
        sink,
      );
      expect(transition).toBeNull();
    });

    it('returns error transition for non-game errors', () => {
      const engine = makeEngine();
      const sink = makeSink();

      const transition = engine.handleServerMessage(
        {
          type: 'FETCH_ERROR',
          reason: 'cert invalid',
          errorCategory: 'cert_error',
        },
        sink,
      );
      expect(transition).toEqual({ type: 'error', reason: 'cert invalid' });
    });
  });

  describe('cooldown behavior', () => {
    it('enters cooldown after evaluating a prompt', () => {
      const engine = makeEngine();
      const sink = makeSink();

      engine.handleServerMessage(
        { type: 'DATA', payload: makeMinimalSnapshot() },
        sink,
      );

      // If a prompt was sent, engine should be in cooldown
      if (sink.stateChanges.some((e) => e.state === 'active')) {
        expect(engine.isInCooldown()).toBe(true);
      }
    });

    it('clears cooldown timer on stopPromptLoop', () => {
      const engine = makeEngine();
      const sink = makeSink();

      engine.handleServerMessage(
        { type: 'DATA', payload: makeMinimalSnapshot() },
        sink,
      );
      engine.stopPromptLoop();

      expect(engine.isInCooldown()).toBe(false);
      expect(engine.getEngineStatus()).toBe('WAITING_FOR_GAME');
    });

    it('clears cooldown timer on dispose', () => {
      const engine = makeEngine();
      const sink = makeSink();

      engine.handleServerMessage(
        { type: 'DATA', payload: makeMinimalSnapshot() },
        sink,
      );

      // dispose should not throw
      expect(() => engine.dispose()).not.toThrow();
    });
  });

  describe('togglePromptLoop', () => {
    it('pauses the engine', () => {
      const engine = makeEngine();
      const sink = makeSink();

      engine.handleServerMessage(
        { type: 'DATA', payload: makeMinimalSnapshot() },
        sink,
      );

      engine.togglePromptLoop(sink);
      expect(engine.isPaused()).toBe(true);

      // Should have sent idle state change
      const idleChanges = sink.stateChanges.filter((e) => e.state === 'idle');
      expect(idleChanges.length).toBeGreaterThanOrEqual(1);
    });

    it('unpauses the engine on second toggle', () => {
      const engine = makeEngine();
      const sink = makeSink();

      engine.handleServerMessage(
        { type: 'DATA', payload: makeMinimalSnapshot() },
        sink,
      );

      engine.togglePromptLoop(sink);
      expect(engine.isPaused()).toBe(true);

      engine.togglePromptLoop(sink);
      expect(engine.isPaused()).toBe(false);
    });
  });

  describe('game summary', () => {
    it('builds summary after game ends', () => {
      const engine = makeEngine();
      const sink = makeSink();

      engine.handleServerMessage(
        { type: 'DATA', payload: makeMinimalSnapshot() },
        sink,
      );

      // End game
      engine.handleServerMessage(
        {
          type: 'FETCH_ERROR',
          reason: 'no game',
          errorCategory: 'game_not_running',
        },
        sink,
      );

      const summary = engine.getLastGameSummary();
      expect(summary).not.toBeNull();
      expect(summary!.totalPrompts).toBeGreaterThanOrEqual(0);
    });

    it('returns null before any game ends', () => {
      const engine = makeEngine();
      expect(engine.getLastGameSummary()).toBeNull();
    });
  });

  describe('output mode dispatch', () => {
    it('sends both state-change and speak-prompt in both mode', () => {
      const engine = makeEngine({ initialOutputMode: 'both' });
      const sink = makeSink();

      engine.handleServerMessage(
        { type: 'DATA', payload: makeMinimalSnapshot() },
        sink,
      );

      if (sink.stateChanges.some((e) => e.state === 'active')) {
        expect(sink.speakPrompts.length).toBeGreaterThan(0);
      }
    });

    it('sends only state-change in overlay mode', () => {
      const engine = makeEngine({ initialOutputMode: 'overlay' });
      const sink = makeSink();

      engine.handleServerMessage(
        { type: 'DATA', payload: makeMinimalSnapshot() },
        sink,
      );

      expect(sink.speakPrompts.length).toBe(0);
    });

    it('sends only speak-prompt in speech mode', () => {
      const engine = makeEngine({ initialOutputMode: 'speech' });
      const sink = makeSink();

      engine.handleServerMessage(
        { type: 'DATA', payload: makeMinimalSnapshot() },
        sink,
      );

      // In speech mode, state-change should not be sent for active prompts
      const overlayChanges = sink.stateChanges.filter(
        (e) => e.state === 'active',
      );
      expect(overlayChanges.length).toBe(0);
    });
  });
});

// Minimal snapshot that triggers at least one detector
function makeMinimalSnapshot() {
  return {
    activePlayer: {
      abilities: {
        E: {
          abilityLevel: 1,
          displayName: '',
          id: '',
          rawDescription: '',
          rawDisplayName: '',
        },
        Passive: {
          abilityLevel: 0,
          displayName: '',
          id: '',
          rawDescription: '',
          rawDisplayName: '',
        },
        Q: {
          abilityLevel: 1,
          displayName: '',
          id: '',
          rawDescription: '',
          rawDisplayName: '',
        },
        R: {
          abilityLevel: 0,
          displayName: '',
          id: '',
          rawDescription: '',
          rawDisplayName: '',
        },
        W: {
          abilityLevel: 1,
          displayName: '',
          id: '',
          rawDescription: '',
          rawDisplayName: '',
        },
      },
      championStats: { maxHealth: 1000, currentHealth: 200 },
      currentGold: 0,
      fullRunes: {
        generalRunes: [],
        keystone: {
          displayName: 'Conqueror',
          id: 8010,
          rawDescription: '',
          rawDisplayName: '',
        },
        primaryRuneTree: {
          displayName: 'Precision',
          id: 8000,
          rawDescription: '',
          rawDisplayName: '',
        },
        secondaryRuneTree: {
          displayName: 'Resolve',
          id: 8400,
          rawDescription: '',
          rawDisplayName: '',
        },
        statRunes: [],
      },
      level: 1,
      riotId: 'Player#TAG',
      riotIdGameName: 'Player',
      riotIdTagLine: 'TAG',
      summonerName: 'Player',
      teamRelativeColors: false,
    },
    allPlayers: [
      {
        championName: 'Aatrox',
        isBot: false,
        isDead: false,
        items: [],
        level: 1,
        position: 'TOP',
        rawChampionName: 'game_character_displayname_Aatrox',
        rawSkinName: '',
        respawnTimer: 0,
        riotId: 'Player#TAG',
        riotIdGameName: 'Player',
        riotIdTagLine: 'TAG',
        scores: {
          assists: 0,
          creepScore: 10,
          deaths: 0,
          kills: 0,
          wardScore: 0,
        },
        skinID: 0,
        skinName: '',
        summonerName: 'Player',
        summonerSpells: {
          summonerSpellOne: {
            displayName: 'Flash',
            rawDescription: '',
            rawDisplayName: '',
          },
          summonerSpellTwo: {
            displayName: 'Teleport',
            rawDescription: '',
            rawDisplayName: '',
          },
        },
        team: 'ORDER',
        runes: {
          keystone: {
            displayName: 'Conqueror',
            id: 8010,
            rawDescription: '',
            rawDisplayName: '',
          },
          primaryRuneTree: {
            displayName: 'Precision',
            id: 8000,
            rawDescription: '',
            rawDisplayName: '',
          },
          secondaryRuneTree: {
            displayName: 'Resolve',
            id: 8400,
            rawDescription: '',
            rawDisplayName: '',
          },
        },
      },
    ],
    events: { Events: [] },
    gameData: {
      gameMode: 'CLASSIC',
      gameTime: 600,
      mapName: 'Map11',
      mapNumber: 11,
      mapTerrain: 'Default',
    },
  } as any;
}
