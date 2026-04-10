import { describe, it, expect } from 'vitest';
import type { GameSnapshot } from '../riot.types.js';
import { isValidSnapshot } from './validation.js';

function makeValidSnapshot(overrides?: Record<string, unknown>): unknown {
  return {
    activePlayer: {
      riotId: 'Player#TAG',
      riotIdGameName: 'Player',
      level: 1,
      currentGold: 0,
      championStats: { maxHealth: 1000, currentHealth: 600 },
    },
    allPlayers: [],
    events: { Events: [] },
    gameData: { gameMode: 'CLASSIC', gameTime: 300, mapName: 'Map11', mapNumber: 11, mapTerrain: 'Default' },
    ...overrides,
  };
}

describe('isValidSnapshot', () => {
  it('returns true for valid snapshot', () => {
    const valid: GameSnapshot = {
      activePlayer: {
        abilities: {}, championStats: { maxHealth: 1000, currentHealth: 600 }, currentGold: 0, fullRunes: { generalRunes: [], keystone: {} as any, primaryRuneTree: {} as any, secondaryRuneTree: {} as any, statRunes: [] },
        level: 1, riotId: 'Player#TAG', riotIdGameName: 'Player', riotIdTagLine: 'TAG', summonerName: 'Player',
      } as any,
      allPlayers: [],
      events: { Events: [] },
      gameData: { gameMode: 'CLASSIC', gameTime: 300, mapName: 'Map11', mapNumber: 11, mapTerrain: 'Default' },
    };
    expect(isValidSnapshot(valid)).toBe(true);
  });

  it('returns false for null', () => {
    expect(isValidSnapshot(null)).toBe(false);
  });

  it('returns false for primitive values', () => {
    expect(isValidSnapshot('string')).toBe(false);
    expect(isValidSnapshot(123)).toBe(false);
    expect(isValidSnapshot(true)).toBe(false);
  });

  it('returns false when activePlayer is missing', () => {
    const invalid = { allPlayers: [], events: {}, gameData: { gameTime: 300 } };
    expect(isValidSnapshot(invalid)).toBe(false);
  });

  it('returns false when activePlayer is null', () => {
    const invalid = { activePlayer: null, allPlayers: [], events: {}, gameData: { gameTime: 300 } };
    expect(isValidSnapshot(invalid)).toBe(false);
  });

  it('returns false when allPlayers is not an array', () => {
    expect(isValidSnapshot(makeValidSnapshot({ allPlayers: 'not an array' }))).toBe(false);
  });

  it('returns false when events is missing', () => {
    const invalid = { activePlayer: {}, allPlayers: [], gameData: { gameTime: 300 } };
    expect(isValidSnapshot(invalid)).toBe(false);
  });

  it('returns false when gameData is missing', () => {
    const invalid = { activePlayer: {}, allPlayers: [], events: {} };
    expect(isValidSnapshot(invalid)).toBe(false);
  });

  it('returns false when gameTime is missing', () => {
    expect(isValidSnapshot(makeValidSnapshot({ gameData: { gameMode: 'CLASSIC' } }))).toBe(false);
  });

  it('returns false when gameTime is not a number', () => {
    expect(isValidSnapshot(makeValidSnapshot({ gameData: { gameTime: '300' } }))).toBe(false);
  });

  it('returns true when gameTime is zero', () => {
    expect(isValidSnapshot(makeValidSnapshot({ gameData: { gameTime: 0 } }))).toBe(true);
  });

  it('returns false when events.Events is not an array', () => {
    expect(isValidSnapshot(makeValidSnapshot({ events: { Events: 'not array' } }))).toBe(false);
  });

  it('returns false when championStats.maxHealth is missing', () => {
    expect(isValidSnapshot(makeValidSnapshot({
      activePlayer: { riotId: 'x', riotIdGameName: 'x', level: 1, currentGold: 0, championStats: { currentHealth: 100 } },
    }))).toBe(false);
  });

  it('returns false when championStats.maxHealth is not a number', () => {
    expect(isValidSnapshot(makeValidSnapshot({
      activePlayer: { riotId: 'x', riotIdGameName: 'x', level: 1, currentGold: 0, championStats: { maxHealth: '100', currentHealth: 100 } },
    }))).toBe(false);
  });

  it('returns false when championStats.currentHealth is missing', () => {
    expect(isValidSnapshot(makeValidSnapshot({
      activePlayer: { riotId: 'x', riotIdGameName: 'x', level: 1, currentGold: 0, championStats: { maxHealth: 1000 } },
    }))).toBe(false);
  });

  it('returns false when activePlayer.riotId is missing', () => {
    expect(isValidSnapshot(makeValidSnapshot({
      activePlayer: { riotIdGameName: 'Player', level: 1, currentGold: 0, championStats: { maxHealth: 1000, currentHealth: 600 } },
    }))).toBe(false);
  });

  it('returns false when activePlayer.riotIdGameName is missing', () => {
    expect(isValidSnapshot(makeValidSnapshot({
      activePlayer: { riotId: 'Player#TAG', level: 1, currentGold: 0, championStats: { maxHealth: 1000, currentHealth: 600 } },
    }))).toBe(false);
  });

  it('returns false when activePlayer.level is not a number', () => {
    expect(isValidSnapshot(makeValidSnapshot({
      activePlayer: { riotId: 'x', riotIdGameName: 'x', level: '1', currentGold: 0, championStats: { maxHealth: 1000, currentHealth: 600 } },
    }))).toBe(false);
  });

  it('returns false when activePlayer.currentGold is not a number', () => {
    expect(isValidSnapshot(makeValidSnapshot({
      activePlayer: { riotId: 'x', riotIdGameName: 'x', level: 1, currentGold: null, championStats: { maxHealth: 1000, currentHealth: 600 } },
    }))).toBe(false);
  });
});
