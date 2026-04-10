import { describe, it, expect } from 'vitest';
import { getGamePhase, getCategoryWeight } from './phases.js';
import type { PromptCategory } from '../types.js';
import {
  deriveContext,
  initialContextState,
  type ContextState,
} from './context.js';
import type { GameSnapshot, Player } from '../riot.types.js';

// =========================================================
// getGamePhase
// =========================================================
describe('getGamePhase', () => {
  it('returns early_laning at 0 seconds', () => {
    expect(getGamePhase(0)).toBe('early_laning');
  });

  it('returns early_laning at 479 seconds', () => {
    expect(getGamePhase(479)).toBe('early_laning');
  });

  it('returns mid_laning at 480 seconds', () => {
    expect(getGamePhase(480)).toBe('mid_laning');
  });

  it('returns mid_laning at 839 seconds', () => {
    expect(getGamePhase(839)).toBe('mid_laning');
  });

  it('returns mid_game at 840 seconds', () => {
    expect(getGamePhase(840)).toBe('mid_game');
  });

  it('returns mid_game at 1499 seconds', () => {
    expect(getGamePhase(1499)).toBe('mid_game');
  });

  it('returns late_game at 1500 seconds', () => {
    expect(getGamePhase(1500)).toBe('late_game');
  });

  it('returns late_game at very high game time', () => {
    expect(getGamePhase(5000)).toBe('late_game');
  });
});

// =========================================================
// getCategoryWeight
// =========================================================
describe('getCategoryWeight', () => {
  it('returns 2 for wave_management in early_laning', () => {
    expect(getCategoryWeight('early_laning', 'wave_management' as PromptCategory)).toBe(2);
  });

  it('returns 0.5 for objectives in early_laning', () => {
    expect(getCategoryWeight('early_laning', 'objectives' as PromptCategory)).toBe(0.5);
  });

  it('returns 2 for objectives in mid_game', () => {
    expect(getCategoryWeight('mid_game', 'objectives' as PromptCategory)).toBe(2);
  });

  it('returns 0.1 for trading in late_game', () => {
    expect(getCategoryWeight('late_game', 'trading' as PromptCategory)).toBe(0.1);
  });

  it('defaults to 1 for unknown categories', () => {
    expect(getCategoryWeight('early_laning', 'unknown_category' as PromptCategory)).toBe(1);
  });
});

// =========================================================
// Phase weight multiplication in deriveContext
// =========================================================

const defaultScores: Player['scores'] = {
  assists: 0,
  creepScore: 45,
  deaths: 0,
  kills: 0,
  wardScore: 0,
};

const defaultRunes: Player['runes'] = {
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
};

const defaultSpells: Player['summonerSpells'] = {
  summonerSpellOne: {
    displayName: 'Flash',
    rawDescription: '',
    rawDisplayName: '',
  },
  summonerSpellTwo: {
    displayName: 'Ignite',
    rawDescription: '',
    rawDisplayName: '',
  },
};

function makeSnapshot(
  overrides: {
    gameTime?: number;
    level?: number;
    gold?: number;
    isDead?: boolean;
    creepScore?: number;
    enemyCreepScore?: number;
    events?: GameSnapshot['events']['Events'];
  } = {},
): GameSnapshot {
  const gameTime = overrides.gameTime ?? 300;
  return {
    activePlayer: {
      abilities: {
        Passive: {
          displayName: 'Passive',
          id: 'P',
          rawDescription: '',
          rawDisplayName: '',
        },
        Q: {
          abilityLevel: 1,
          displayName: 'Q',
          id: 'Q',
          rawDescription: '',
          rawDisplayName: '',
        },
        W: {
          abilityLevel: 0,
          displayName: 'W',
          id: 'W',
          rawDescription: '',
          rawDisplayName: '',
        },
        E: {
          abilityLevel: 0,
          displayName: 'E',
          id: 'E',
          rawDescription: '',
          rawDisplayName: '',
        },
        R: {
          abilityLevel: 0,
          displayName: 'R',
          id: 'R',
          rawDescription: '',
          rawDisplayName: '',
        },
      },
      championStats: {
        abilityHaste: 0,
        abilityPower: 0,
        armor: 30,
        armorPenetrationFlat: 0,
        armorPenetrationPercent: 1,
        attackDamage: 60,
        attackRange: 175,
        attackSpeed: 0.65,
        bonusArmorPenetrationPercent: 1,
        bonusMagicPenetrationPercent: 1,
        critChance: 0,
        critDamage: 200,
        currentHealth: 700,
        healShieldPower: 0,
        healthRegenRate: 1.8,
        lifeSteal: 0,
        magicLethality: 0,
        magicPenetrationFlat: 0,
        magicPenetrationPercent: 1,
        magicResist: 32,
        maxHealth: 700,
        moveSpeed: 340,
        omnivamp: 0,
        physicalLethality: 0,
        physicalVamp: 0,
        resourceMax: 400,
        resourceRegenRate: 1.6,
        resourceType: 'MANA',
        resourceValue: 400,
        spellVamp: 0,
        tenacity: 5,
      },
      currentGold: overrides.gold ?? 500,
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
      level: overrides.level ?? 1,
      riotId: 'Player#123',
      riotIdGameName: 'Player',
      riotIdTagLine: '123',
      summonerName: 'Player#123',
    },
    allPlayers: [
      {
        championName: 'Sylas',
        isBot: false,
        isDead: overrides.isDead ?? false,
        items: [],
        level: overrides.level ?? 1,
        position: 'MIDDLE',
        respawnTimer: 0,
        riotId: 'Player#123',
        riotIdGameName: 'Player',
        riotIdTagLine: '123',
        runes: defaultRunes,
        scores: {
          ...defaultScores,
          creepScore: overrides.creepScore ?? 45,
        },
        summonerSpells: defaultSpells,
        team: 'ORDER',
      },
      {
        championName: 'Zed',
        isBot: false,
        isDead: false,
        items: [],
        level: overrides.level ?? 1,
        position: 'MIDDLE',
        respawnTimer: 0,
        riotId: 'Enemy#456',
        riotIdGameName: 'Enemy',
        riotIdTagLine: '456',
        runes: defaultRunes,
        scores: {
          ...defaultScores,
          creepScore: overrides.enemyCreepScore ?? 45,
        },
        summonerSpells: defaultSpells,
        team: 'CHAOS',
      },
    ],
    events: { Events: overrides.events ?? [] },
    gameData: {
      gameMode: 'CLASSIC',
      gameTime,
      mapName: 'Map11',
      mapNumber: 11,
      mapTerrain: 'Default',
    },
  };
}

function makeState(overrides: Partial<ContextState> = {}): ContextState {
  return {
    ...initialContextState,
    lastVisionCheckAt: 200,
    lastTabCheckAt: 200,
    ...overrides,
  };
}

describe('phase weight multiplication in deriveContext', () => {
  it('boosts trading priority in early_laning (weight 2)', () => {
    // Level spike at level 6 triggers trading with base priority 72
    // early_laning (gameTime < 480) trading weight = 2 → effective = 144
    const snap = makeSnapshot({ gameTime: 300, level: 6 });
    const state = makeState({ lastKnownLevel: 5 });
    const { result } = deriveContext(snap, state);
    expect(result?.category).toBe('trading');
  });

  it('suppresses trading in late_game (weight 0.1)', () => {
    // Level spike at level 16 triggers trading with base priority 72
    // late_game (gameTime >= 1500) trading weight = 0.1 → effective = 7.2
    // Vision fires with base priority 30, weight 1.5 in late_game → effective = 45
    // Vision (45) > trading (7.2), so vision wins
    const snap = makeSnapshot({ gameTime: 1600, level: 16 });
    const state = makeState({
      lastKnownLevel: 15,
      lastVisionCheckAt: 0,   // triggers vision (1600 - 0 >= 240)
      lastTabCheckAt: 1500,
    });
    const { result } = deriveContext(snap, state);
    // Vision should beat suppressed trading
    expect(result?.reason).not.toBe('level_16');
    expect(result?.category).toBe('vision');
  });

  it('boosts objectives in mid_game (weight 2)', () => {
    // Baron upcoming at 1150 during mid_game (840-1499)
    // objectives weight = 2 in mid_game, base priority = 88, effective = 176
    const snap = makeSnapshot({ gameTime: 1150 });
    const state = makeState({
      lastVisionCheckAt: 1100,
      lastTabCheckAt: 1100,
    });
    const { result } = deriveContext(snap, state);
    expect(result?.category).toBe('objectives');
    expect(result?.reason).toBe('baron_upcoming');
  });
});
