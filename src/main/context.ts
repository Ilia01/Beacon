import type { GameEvent, GameSnapshot } from '../riot.types.js';
import type { PromptCategory } from '../types.js';
import { getGamePhase, getCategoryWeight } from './phases.js';
import { ALL_DETECTORS, type DetectorResult } from './detectors.js';

export type ContextResult = {
  category: PromptCategory;
  reason: string;
  data: Record<string, string>;
};

export type ContextState = {
  lastEventId: number;
  lastTabCheckAt: number;
  lastVisionCheckAt: number;
  lastKnownLevel: number;
  lastDragonKillTime: number;
  lastBaronKillTime: number;
  lastMyItemCount: number;
  lastEnemyItemCount: number;
};

export const initialContextState: ContextState = {
  lastEventId: 0,
  lastTabCheckAt: 0,
  lastVisionCheckAt: 0,
  lastKnownLevel: 1,
  lastDragonKillTime: 0,
  lastBaronKillTime: 0,
  lastMyItemCount: 0,
  lastEnemyItemCount: 0,
};

function processEvents(
  allEvents: GameEvent[],
  state: ContextState,
  newState: ContextState,
): GameEvent[] {
  const newEvents = allEvents.filter((e) => e.EventID > state.lastEventId);

  if (newEvents.length > 0) {
    newState.lastEventId = newEvents.reduce(
      (max, e) => Math.max(max, e.EventID),
      0,
    );

    for (const event of newEvents) {
      if (event.EventName === 'DragonKill') {
        newState.lastDragonKillTime = event.EventTime;
      } else if (event.EventName === 'BaronKill') {
        newState.lastBaronKillTime = event.EventTime;
      }
    }
  }

  return newEvents;
}

export function deriveContext(
  snapshot: GameSnapshot,
  state: ContextState,
): { result: ContextResult | null; newState: ContextState } {
  const { activePlayer, allPlayers, events, gameData } = snapshot;
  const { gameTime } = gameData;

  const newState: ContextState = { ...state };
  const me = allPlayers.find((p) => p.riotId === activePlayer.riotId);
  const enemyLaner = me
    ? allPlayers.find((p) => p.position === me.position && p.team !== me.team)
    : undefined;

  newState.lastKnownLevel = activePlayer.level;

  const newEvents = processEvents(events.Events, state, newState);
  const phase = getGamePhase(gameTime);

  const input = { snapshot, me, enemyLaner, newEvents, state, newState };

  const results: DetectorResult[] = [];
  for (const detector of ALL_DETECTORS) {
    const result = detector(input);
    if (result) {
      const weight = getCategoryWeight(phase, result.category);
      if (weight > 0) {
        results.push({ ...result, priority: result.priority * weight });
      }
    }
  }

  if (results.length === 0) {
    return {
      result: {
        category: 'map_awareness' as PromptCategory,
        reason: 'fallback',
        data: {},
      },
      newState,
    };
  }

  results.sort((a, b) => b.priority - a.priority);
  const best = results[0]!;

  return {
    result: {
      category: best.category,
      reason: best.reason,
      data: best.data,
    },
    newState,
  };
}
