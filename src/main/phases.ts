import type { PromptCategory } from '../types.js';

export type GamePhase =
  | 'early_laning'
  | 'mid_laning'
  | 'mid_game'
  | 'late_game';

type PhaseBoundary = {
  phase: GamePhase;
  minTime: number;
};

const PHASE_BOUNDARIES: readonly PhaseBoundary[] = [
  { phase: 'late_game', minTime: 1500 },
  { phase: 'mid_game', minTime: 840 },
  { phase: 'mid_laning', minTime: 480 },
  { phase: 'early_laning', minTime: 0 },
];

export function getGamePhase(gameTimeSeconds: number): GamePhase {
  for (const { phase, minTime } of PHASE_BOUNDARIES) {
    if (gameTimeSeconds >= minTime) return phase;
  }
  return 'early_laning';
}

// Multiplier per category per phase. 0 = suppressed, 1 = normal, 2 = boosted.
const PHASE_WEIGHTS: Record<
  GamePhase,
  Partial<Record<PromptCategory, number>>
> = {
  early_laning: {
    wave_management: 2,
    trading: 2,
    vision: 0.5,
    objectives: 0.5,
    macro: 0.5,
    reset_timing: 1.5,
    map_awareness: 1,
    tab_check: 0.5,
    mental: 1,
  },
  mid_laning: {
    wave_management: 1.5,
    trading: 1,
    vision: 1.5,
    objectives: 1.5,
    macro: 1,
    reset_timing: 1,
    map_awareness: 1.5,
    tab_check: 1,
    mental: 1,
  },
  mid_game: {
    wave_management: 0.5,
    trading: 0.5,
    vision: 1.5,
    objectives: 2,
    macro: 2,
    reset_timing: 1,
    map_awareness: 1.5,
    tab_check: 1.5,
    mental: 1,
  },
  late_game: {
    wave_management: 0.5,
    trading: 0.1,
    vision: 1.5,
    objectives: 2,
    macro: 2,
    reset_timing: 1.5,
    map_awareness: 1,
    tab_check: 1,
    mental: 1.5,
  },
};

export function getCategoryWeight(
  phase: GamePhase,
  category: PromptCategory,
): number {
  return PHASE_WEIGHTS[phase][category] ?? 1;
}
