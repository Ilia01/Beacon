import type { GameEvent, GameSnapshot } from '../riot.types.js';
import type { PromptCategory } from '../types.js';
import { getGamePhase, getCategoryWeight } from './phases.js';
import {
  ALL_DETECTORS,
  getRealItems,
  type DetectorResult,
} from './detectors.js';

export type ContextResult = {
  category: PromptCategory;
  reason: string;
  data: Record<string, string>;
};

export type AbilityLevels = { Q: number; W: number; E: number; R: number };

export type ContextState = {
  lastEventId: number;
  lastTabCheckAt: number;
  lastVisionCheckAt: number;
  lastKnownLevel: number;
  lastDragonKillTime: number;
  lastBaronKillTime: number;
  lastMyItemIds: number[];
  lastEnemyItemIds: number[];
  lastAbilityLevels: AbilityLevels | null;
};

export const initialContextState: ContextState = {
  lastEventId: 0,
  lastTabCheckAt: 0,
  lastVisionCheckAt: 0,
  lastKnownLevel: 1,
  lastDragonKillTime: 0,
  lastBaronKillTime: 0,
  lastMyItemIds: [],
  lastEnemyItemIds: [],
  lastAbilityLevels: null,
};

function processEvents(
  allEvents: GameEvent[],
  state: ContextState,
): { newEvents: GameEvent[]; stateUpdates: Partial<ContextState> } {
  const newEvents = allEvents.filter((e) => e.EventID > state.lastEventId);
  const stateUpdates: Partial<ContextState> = {};

  if (newEvents.length > 0) {
    stateUpdates.lastEventId = newEvents.reduce(
      (max, e) => Math.max(max, e.EventID),
      0,
    );

    for (const event of newEvents) {
      if (event.EventName === 'DragonKill') {
        stateUpdates.lastDragonKillTime = event.EventTime;
      } else if (event.EventName === 'BaronKill') {
        stateUpdates.lastBaronKillTime = event.EventTime;
      }
    }
  }

  return { newEvents, stateUpdates };
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

  const { newEvents, stateUpdates: eventUpdates } = processEvents(
    events.Events,
    state,
  );
  Object.assign(newState, eventUpdates);

  // Track current item IDs for future comparisons
  if (me) {
    newState.lastMyItemIds = getRealItems(me).map((i) => i.itemID);
  }
  if (enemyLaner) {
    newState.lastEnemyItemIds = getRealItems(enemyLaner).map((i) => i.itemID);
  }

  // Track ability levels each snapshot so detectAbilitySpike sees transitions
  newState.lastAbilityLevels = {
    Q: activePlayer.abilities.Q.abilityLevel,
    W: activePlayer.abilities.W.abilityLevel,
    E: activePlayer.abilities.E.abilityLevel,
    R: activePlayer.abilities.R.abilityLevel,
  };

  const phase = getGamePhase(gameTime);

  const input = { snapshot, me, enemyLaner, newEvents, state };

  const results: DetectorResult[] = [];
  for (const detector of ALL_DETECTORS) {
    const result = detector(input);
    if (result) {
      if (result.stateUpdates) {
        Object.assign(newState, result.stateUpdates);
      }
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
