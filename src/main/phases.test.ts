import { describe, it, expect } from 'vitest';
import { getGamePhase, getCategoryWeight, type GamePhase } from './phases.js';

describe('getGamePhase', () => {
  it('returns early_laning for gameTime < 480', () => {
    expect(getGamePhase(0)).toBe('early_laning');
    expect(getGamePhase(120)).toBe('early_laning');
    expect(getGamePhase(479)).toBe('early_laning');
  });

  it('returns mid_laning for 480 <= gameTime < 840', () => {
    expect(getGamePhase(480)).toBe('mid_laning');
    expect(getGamePhase(600)).toBe('mid_laning');
    expect(getGamePhase(839)).toBe('mid_laning');
  });

  it('returns mid_game for 840 <= gameTime < 1500', () => {
    expect(getGamePhase(840)).toBe('mid_game');
    expect(getGamePhase(1000)).toBe('mid_game');
    expect(getGamePhase(1499)).toBe('mid_game');
  });

  it('returns late_game for gameTime >= 1500', () => {
    expect(getGamePhase(1500)).toBe('late_game');
    expect(getGamePhase(1800)).toBe('late_game');
    expect(getGamePhase(2400)).toBe('late_game');
  });
});

describe('getCategoryWeight', () => {
  describe('early_laning phase', () => {
    it('boosts wave_management and trading', () => {
      expect(getCategoryWeight('early_laning', 'wave_management')).toBe(2);
      expect(getCategoryWeight('early_laning', 'trading')).toBe(2);
    });

    it('suppresses vision and objectives', () => {
      expect(getCategoryWeight('early_laning', 'vision')).toBe(0.5);
      expect(getCategoryWeight('early_laning', 'objectives')).toBe(0.5);
    });

    it('boosts reset_timing', () => {
      expect(getCategoryWeight('early_laning', 'reset_timing')).toBe(1.5);
    });

    it('defaults unknown categories to 1', () => {
      const unknownCategory = 'unknown_category' as import('../types.js').PromptCategory;
      expect(getCategoryWeight('early_laning', unknownCategory)).toBe(1);
      expect(getCategoryWeight('mid_game', unknownCategory)).toBe(1);
    });
  });

  describe('mid_laning phase', () => {
    it('balances wave_management and vision', () => {
      expect(getCategoryWeight('mid_laning', 'wave_management')).toBe(1.5);
      expect(getCategoryWeight('mid_laning', 'vision')).toBe(1.5);
    });

    it('boosts objectives and map_awareness', () => {
      expect(getCategoryWeight('mid_laning', 'objectives')).toBe(1.5);
      expect(getCategoryWeight('mid_laning', 'map_awareness')).toBe(1.5);
    });
  });

  describe('mid_game phase', () => {
    it('boosts objectives and macro heavily', () => {
      expect(getCategoryWeight('mid_game', 'objectives')).toBe(2);
      expect(getCategoryWeight('mid_game', 'macro')).toBe(2);
    });

    it('suppresses wave_management and trading', () => {
      expect(getCategoryWeight('mid_game', 'wave_management')).toBe(0.5);
      expect(getCategoryWeight('mid_game', 'trading')).toBe(0.5);
    });
  });

  describe('late_game phase', () => {
    it('boosts objectives and macro', () => {
      expect(getCategoryWeight('late_game', 'objectives')).toBe(2);
      expect(getCategoryWeight('late_game', 'macro')).toBe(2);
    });

    it('suppresses wave_management and trading significantly', () => {
      expect(getCategoryWeight('late_game', 'wave_management')).toBe(0.5);
      expect(getCategoryWeight('late_game', 'trading')).toBe(0.1);
    });

    it('boosts mental slightly', () => {
      expect(getCategoryWeight('late_game', 'mental')).toBe(1.5);
    });
  });
});
