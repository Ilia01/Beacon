import type { GameEvent, GameSnapshot, Player } from '../riot.types.js';
import type { PromptCategory } from '../types.js';
import {
  CS_THRESHOLD,
  DRAGON_FIRST_SPAWN_S,
  DRAGON_RESPAWN_S,
  BARON_FIRST_SPAWN_S,
  BARON_RESPAWN_S,
  GOLD_RECALL_MAX,
  GOLD_RECALL_MIN,
  GOLD_SITTING,
  OBJECTIVE_UPCOMING_WINDOW_S,
  TAB_CHECK_INTERVAL_S,
  TRADING_LEVEL_SPIKES,
  VISION_CHECK_INTERVAL_S,
} from '../constants.js';

export type ContextResult = {
  category: PromptCategory;
  reason: string;
};

export type ContextState = {
  lastEventId: number;
  lastTabCheckAt: number;
  lastVisionCheckAt: number;
  lastKnownLevel: number;
  lastDragonKillTime: number;
  lastBaronKillTime: number;
};

export const initialContextState: ContextState = {
  lastEventId: 0,
  lastTabCheckAt: 0,
  lastVisionCheckAt: 0,
  lastKnownLevel: 1,
  lastDragonKillTime: 0,
  lastBaronKillTime: 0,
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

function checkDeath(me: Player | undefined): ContextResult | null {
  return me?.isDead ? { category: 'mental', reason: 'player_dead' } : null;
}

function checkPlayerKill(
  newEvents: GameEvent[],
  killerName: string,
): ContextResult | null {
  const kill = newEvents.find(
    (e) => e.EventName === 'ChampionKill' && e.KillerName === killerName,
  );
  return kill ? { category: 'macro', reason: 'player_kill' } : null;
}

const OBJECTIVE_EVENTS = new Set([
  'DragonKill',
  'BaronKill',
  'RiftHeraldKill',
  'TurretKilled',
  'InhibKilled',
]);

function checkObjectiveTaken(newEvents: GameEvent[]): ContextResult | null {
  const event = newEvents.find((e) => OBJECTIVE_EVENTS.has(e.EventName));
  return event ? { category: 'objectives', reason: event.EventName } : null;
}

function isObjectiveUpcoming(
  gameTime: number,
  lastKillTime: number,
  firstSpawnTime: number,
  respawnDelay: number,
): boolean {
  const nextSpawn =
    lastKillTime === 0 ? firstSpawnTime : lastKillTime + respawnDelay;
  return (
    gameTime >= nextSpawn - OBJECTIVE_UPCOMING_WINDOW_S &&
    gameTime < nextSpawn - 10
  );
}

function checkObjectiveUpcoming(
  gameTime: number,
  state: ContextState,
): ContextResult | null {
  if (
    isObjectiveUpcoming(
      gameTime,
      state.lastBaronKillTime,
      BARON_FIRST_SPAWN_S,
      BARON_RESPAWN_S,
    )
  ) {
    return { category: 'objectives', reason: 'baron_upcoming' };
  }
  if (
    isObjectiveUpcoming(
      gameTime,
      state.lastDragonKillTime,
      DRAGON_FIRST_SPAWN_S,
      DRAGON_RESPAWN_S,
    )
  ) {
    return { category: 'objectives', reason: 'dragon_upcoming' };
  }
  return null;
}

function checkCSBehind(
  me: Player | undefined,
  allPlayers: Player[],
  gameTime: number,
): ContextResult | null {
  if (!me) return null;

  const expectedCS = (gameTime / 60) * 10;
  if (expectedCS <= 20) return null;

  const enemyLaner = allPlayers.find(
    (p) => p.position === me.position && p.team !== me.team,
  );

  if (
    me.scores.creepScore < expectedCS * CS_THRESHOLD &&
    (!enemyLaner || me.scores.creepScore < enemyLaner.scores.creepScore - 2)
  ) {
    return { category: 'wave_management', reason: 'cs_behind' };
  }
  return null;
}

function checkGold(gold: number): ContextResult | null {
  if (gold >= GOLD_RECALL_MIN && gold <= GOLD_RECALL_MAX) {
    return { category: 'reset_timing', reason: 'recall_window' };
  }
  if (gold >= GOLD_SITTING) {
    return { category: 'reset_timing', reason: 'sitting_on_gold' };
  }
  return null;
}

function checkLevelSpike(
  level: number,
  lastKnownLevel: number,
): ContextResult | null {
  if (level > lastKnownLevel && TRADING_LEVEL_SPIKES.includes(level)) {
    return { category: 'trading', reason: `level_${level}` };
  }
  return null;
}

function checkVision(
  gameTime: number,
  newState: ContextState,
): ContextResult | null {
  if (gameTime - newState.lastVisionCheckAt >= VISION_CHECK_INTERVAL_S) {
    newState.lastVisionCheckAt = gameTime;
    return { category: 'vision', reason: 'periodic' };
  }
  return null;
}

function checkTabCheck(
  gameTime: number,
  newState: ContextState,
): ContextResult | null {
  if (gameTime - newState.lastTabCheckAt >= TAB_CHECK_INTERVAL_S) {
    newState.lastTabCheckAt = gameTime;
    return { category: 'tab_check', reason: 'periodic' };
  }
  return null;
}

export function deriveContext(
  snapshot: GameSnapshot,
  state: ContextState,
): { result: ContextResult | null; newState: ContextState } {
  const { activePlayer, allPlayers, events, gameData } = snapshot;
  const { gameTime } = gameData;

  const newState: ContextState = { ...state };
  const me = allPlayers.find((p) => p.riotId === activePlayer.riotId);

  newState.lastKnownLevel = activePlayer.level;

  const newEvents = processEvents(events.Events, state, newState);

  const result = checkDeath(me) ??
    checkPlayerKill(newEvents, activePlayer.riotIdGameName) ??
    checkObjectiveTaken(newEvents) ??
    checkObjectiveUpcoming(gameTime, state) ??
    checkCSBehind(me, allPlayers, gameTime) ??
    checkGold(activePlayer.currentGold) ??
    checkLevelSpike(activePlayer.level, state.lastKnownLevel) ??
    checkVision(gameTime, newState) ??
    checkTabCheck(gameTime, newState) ?? {
      category: 'map_awareness' as PromptCategory,
      reason: 'fallback',
    };

  return { result, newState };
}
