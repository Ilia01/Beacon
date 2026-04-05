import { describe, it, expect } from 'vitest';
import type { GameSnapshot } from '../riot.types.js';
import { isValidSnapshot } from './validation.js';

describe('isValidSnapshot', () => {
  it('returns true for valid snapshot', () => {
    const valid: GameSnapshot = {
      activePlayer: {
        abilities: {}, championStats: { maxHealth: 100 }, currentGold: 0, fullRunes: { generalRunes: [], keystone: {} as any, primaryRuneTree: {} as any, secondaryRuneTree: {} as any, statRunes: [] },
        level: 1, riotId: '', riotIdGameName: '', riotIdTagLine: '', summonerName: '',
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
    const invalid = { activePlayer: {}, allPlayers: 'not an array', events: {}, gameData: { gameTime: 300 } };
    expect(isValidSnapshot(invalid)).toBe(false);
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
    const invalid = { activePlayer: {}, allPlayers: [], events: {}, gameData: { gameMode: 'CLASSIC' } };
    expect(isValidSnapshot(invalid)).toBe(false);
  });

  it('returns false when gameTime is not a number', () => {
    const invalid = { activePlayer: { championStats: { maxHealth: 100 } }, allPlayers: [], events: { Events: [] }, gameData: { gameTime: '300' } };
    expect(isValidSnapshot(invalid)).toBe(false);
  });

  it('returns true when gameTime is zero', () => {
    const valid = { activePlayer: { championStats: { maxHealth: 100 } }, allPlayers: [], events: { Events: [] }, gameData: { gameTime: 0 } };
    expect(isValidSnapshot(valid)).toBe(true);
  });

  it('returns false when events.Events is not an array', () => {
    const invalid = { activePlayer: { championStats: { maxHealth: 100 } }, allPlayers: [], events: { Events: 'not array' }, gameData: { gameTime: 300 } };
    expect(isValidSnapshot(invalid)).toBe(false);
  });

  it('returns false when championStats.maxHealth is missing', () => {
    const invalid = { activePlayer: { championStats: {} }, allPlayers: [], events: { Events: [] }, gameData: { gameTime: 300 } };
    expect(isValidSnapshot(invalid)).toBe(false);
  });

  it('returns false when championStats.maxHealth is not a number', () => {
    const invalid = { activePlayer: { championStats: { maxHealth: '100' } }, allPlayers: [], events: { Events: [] }, gameData: { gameTime: 300 } };
    expect(isValidSnapshot(invalid)).toBe(false);
  });
});
