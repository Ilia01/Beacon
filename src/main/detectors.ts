import type {
  ActivePlayer,
  GameEvent,
  GameSnapshot,
  Player,
} from '../riot.types.js';
import type { PromptCategory } from '../types.js';
import type { ContextState } from './context.js';
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

export type DetectorResult = {
  category: PromptCategory;
  reason: string;
  priority: number;
  data: Record<string, string>;
  stateUpdates?: Partial<ContextState>;
};

type DetectorInput = {
  snapshot: GameSnapshot;
  me: Player | undefined;
  enemyLaner: Player | undefined;
  newEvents: GameEvent[];
  state: ContextState;
};

// --- Reactive detectors (event-driven, high priority) ---

export function detectDeath(input: DetectorInput): DetectorResult | null {
  if (!input.me?.isDead) return null;
  return {
    category: 'mental',
    reason: 'player_dead',
    priority: 95,
    data: {},
  };
}

export function detectPlayerKill(input: DetectorInput): DetectorResult | null {
  const { newEvents, snapshot } = input;
  const kill = newEvents.find(
    (e) =>
      e.EventName === 'ChampionKill' &&
      e.KillerName === snapshot.activePlayer.riotIdGameName,
  );
  if (!kill) return null;
  return {
    category: 'macro',
    reason: 'player_kill',
    priority: 85,
    data: { victim: kill.VictimName ?? 'unknown' },
  };
}

const OBJECTIVE_EVENTS = new Set([
  'DragonKill',
  'BaronKill',
  'RiftHeraldKill',
  'TurretKilled',
  'InhibKilled',
]);

export function detectObjectiveTaken(
  input: DetectorInput,
): DetectorResult | null {
  const event = input.newEvents.find((e) => OBJECTIVE_EVENTS.has(e.EventName));
  if (!event) return null;
  return {
    category: 'objectives',
    reason: event.EventName,
    priority: 80,
    data: { objective: event.EventName },
  };
}

export function detectTeamfight(input: DetectorInput): DetectorResult | null {
  const { newEvents, snapshot, me } = input;
  if (!me) return null;

  const gameTime = snapshot.gameData.gameTime;
  const recentKills = newEvents.filter(
    (e) => e.EventName === 'ChampionKill' && gameTime - e.EventTime < 10,
  );
  if (recentKills.length < 3) return null;

  const myTeamKills = recentKills.filter((e) => {
    const killer = snapshot.allPlayers.find(
      (p) => p.riotIdGameName === e.KillerName,
    );
    return killer && killer.team === me.team;
  }).length;

  const won = myTeamKills > recentKills.length - myTeamKills;
  return {
    category: 'macro',
    reason: won ? 'teamfight_won' : 'teamfight_lost',
    priority: 90,
    data: {
      total_kills: String(recentKills.length),
      our_kills: String(myTeamKills),
    },
  };
}

// --- Proactive detectors (state-based, medium priority) ---

export function detectHpCritical(input: DetectorInput): DetectorResult | null {
  const { championStats } = input.snapshot.activePlayer;
  if (championStats.maxHealth === 0) return null;
  const hpPercent = championStats.currentHealth / championStats.maxHealth;
  if (hpPercent >= 0.3) return null;
  if (input.me?.isDead) return null;
  return {
    category: 'reset_timing',
    reason: 'hp_critical',
    priority: 75,
    data: { hp_percent: String(Math.round(hpPercent * 100)) },
  };
}

export function detectEnemyDeathWindow(
  input: DetectorInput,
): DetectorResult | null {
  const { snapshot, me } = input;
  if (!me) return null;

  const deadEnemies = snapshot.allPlayers.filter(
    (p) => p.team !== me.team && p.isDead && p.respawnTimer > 5,
  );
  if (deadEnemies.length === 0) return null;

  const longestDead = deadEnemies.reduce(
    (best, p) => (p.respawnTimer > best.respawnTimer ? p : best),
    deadEnemies[0]!,
  );

  return {
    category: 'macro',
    reason: 'enemy_dead',
    priority: 70,
    data: {
      dead_enemy: longestDead.championName,
      respawn_timer: String(Math.round(longestDead.respawnTimer)),
      dead_count: String(deadEnemies.length),
    },
  };
}

export function getRealItems(player: Player): Player['items'] {
  return player.items.filter((i) => !i.consumable && i.itemID !== 3340);
}

function findNewItemName(
  current: Player['items'],
  prevIds: number[],
): string | null {
  const prevSet = new Set(prevIds);
  const newItem = current.find((i) => !prevSet.has(i.itemID));
  return newItem?.displayName ?? null;
}

export function detectItemCompleted(
  input: DetectorInput,
): DetectorResult | null {
  const { me, enemyLaner, state } = input;
  if (!me) return null;

  const myItems = getRealItems(me);
  const myItemIds = myItems.map((i) => i.itemID);

  if (
    state.lastMyItemIds.length > 0 &&
    myItemIds.length > state.lastMyItemIds.length
  ) {
    const itemName = findNewItemName(myItems, state.lastMyItemIds);
    if (itemName) {
      return {
        category: 'trading',
        reason: 'item_completed',
        priority: 65,
        data: { item: itemName },
      };
    }
  }

  if (!enemyLaner) return null;
  const enemyItems = getRealItems(enemyLaner);
  const enemyItemIds = enemyItems.map((i) => i.itemID);

  if (
    state.lastEnemyItemIds.length > 0 &&
    enemyItemIds.length > state.lastEnemyItemIds.length
  ) {
    const itemName = findNewItemName(enemyItems, state.lastEnemyItemIds);
    if (itemName) {
      return {
        category: 'trading',
        reason: 'enemy_item_completed',
        priority: 70,
        data: {
          enemy: enemyLaner.championName,
          item: itemName,
        },
      };
    }
  }

  return null;
}

export function detectKdaAdaptive(input: DetectorInput): DetectorResult | null {
  const { me } = input;
  if (!me) return null;

  const { kills, deaths, assists } = me.scores;
  if (deaths >= 3 && kills === 0 && assists <= 1) {
    return {
      category: 'mental',
      reason: 'feeding',
      priority: 60,
      data: { kills: String(kills), deaths: String(deaths) },
    };
  }
  if (kills >= 3 && deaths <= 1) {
    return {
      category: 'macro',
      reason: 'fed',
      priority: 55,
      data: { kills: String(kills), deaths: String(deaths) },
    };
  }
  return null;
}

// --- Existing detectors (ported with scoring) ---

function isObjectiveUpcoming(
  gameTime: number,
  lastKillTime: number,
  firstSpawnTime: number,
  respawnDelay: number,
): { upcoming: boolean; timeUntil: number } {
  const nextSpawn =
    lastKillTime === 0 ? firstSpawnTime : lastKillTime + respawnDelay;
  const timeUntil = nextSpawn - gameTime;
  const upcoming = timeUntil <= OBJECTIVE_UPCOMING_WINDOW_S && timeUntil > 10;
  return { upcoming, timeUntil };
}

export function detectObjectiveUpcoming(
  input: DetectorInput,
): DetectorResult | null {
  const gameTime = input.snapshot.gameData.gameTime;

  const baron = isObjectiveUpcoming(
    gameTime,
    input.state.lastBaronKillTime,
    BARON_FIRST_SPAWN_S,
    BARON_RESPAWN_S,
  );
  if (baron.upcoming) {
    return {
      category: 'objectives',
      reason: 'baron_upcoming',
      priority: 88,
      data: { time_until: String(Math.round(baron.timeUntil)) },
    };
  }

  const dragon = isObjectiveUpcoming(
    gameTime,
    input.state.lastDragonKillTime,
    DRAGON_FIRST_SPAWN_S,
    DRAGON_RESPAWN_S,
  );
  if (dragon.upcoming) {
    return {
      category: 'objectives',
      reason: 'dragon_upcoming',
      priority: 82,
      data: { time_until: String(Math.round(dragon.timeUntil)) },
    };
  }

  return null;
}

export function detectCsBehind(input: DetectorInput): DetectorResult | null {
  const { me, enemyLaner, snapshot } = input;
  if (!me) return null;

  const gameTime = snapshot.gameData.gameTime;
  const expectedCS = (gameTime / 60) * 10;
  if (expectedCS <= 20) return null;

  if (
    me.scores.creepScore < expectedCS * CS_THRESHOLD &&
    (!enemyLaner || me.scores.creepScore < enemyLaner.scores.creepScore - 2)
  ) {
    return {
      category: 'wave_management',
      reason: 'cs_behind',
      priority: 45,
      data: {
        my_cs: String(me.scores.creepScore),
        expected_cs: String(Math.round(expectedCS)),
        ...(enemyLaner
          ? { enemy_cs: String(enemyLaner.scores.creepScore) }
          : {}),
      },
    };
  }
  return null;
}

export function detectGold(input: DetectorInput): DetectorResult | null {
  const gold = input.snapshot.activePlayer.currentGold;
  if (gold >= GOLD_RECALL_MIN && gold <= GOLD_RECALL_MAX) {
    return {
      category: 'reset_timing',
      reason: 'recall_window',
      priority: 50,
      data: { gold: String(Math.round(gold)) },
    };
  }
  if (gold >= GOLD_SITTING) {
    return {
      category: 'reset_timing',
      reason: 'sitting_on_gold',
      priority: 60,
      data: { gold: String(Math.round(gold)) },
    };
  }
  return null;
}

export function detectLevelSpike(input: DetectorInput): DetectorResult | null {
  const level = input.snapshot.activePlayer.level;
  if (
    level > input.state.lastKnownLevel &&
    TRADING_LEVEL_SPIKES.includes(level)
  ) {
    return {
      category: 'trading',
      reason: `level_${level}`,
      priority: 72,
      data: { level: String(level) },
    };
  }
  return null;
}

export function detectAbilitySpike(input: DetectorInput): DetectorResult | null {
  const abilities = input.snapshot.activePlayer.abilities;
  const prev = input.state.lastAbilityLevels;

  // First observation: seed without firing (deriveContext handles the update)
  if (prev === null) return null;

  if (abilities.R.abilityLevel > prev.R) {
    if (prev.R === 0) {
      return {
        category: 'trading',
        reason: 'ult_unlock',
        priority: 78,
        data: { ability: 'R' },
      };
    }
    return {
      category: 'trading',
      reason: 'ult_rank_up',
      priority: 74,
      data: { ability: 'R', ability_level: String(abilities.R.abilityLevel) },
    };
  }

  return null;
}

export function detectVision(input: DetectorInput): DetectorResult | null {
  const gameTime = input.snapshot.gameData.gameTime;
  if (gameTime - input.state.lastVisionCheckAt >= VISION_CHECK_INTERVAL_S) {
    return {
      category: 'vision',
      reason: 'periodic',
      priority: 30,
      data: {},
      stateUpdates: { lastVisionCheckAt: gameTime },
    };
  }
  return null;
}

export function detectTabCheck(input: DetectorInput): DetectorResult | null {
  const gameTime = input.snapshot.gameData.gameTime;
  if (gameTime - input.state.lastTabCheckAt >= TAB_CHECK_INTERVAL_S) {
    return {
      category: 'tab_check',
      reason: 'periodic',
      priority: 25,
      data: {},
      stateUpdates: { lastTabCheckAt: gameTime },
    };
  }
  return null;
}

export const ALL_DETECTORS = [
  detectDeath,
  detectTeamfight,
  detectPlayerKill,
  detectObjectiveTaken,
  detectObjectiveUpcoming,
  detectHpCritical,
  detectEnemyDeathWindow,
  detectAbilitySpike,
  detectLevelSpike,
  detectItemCompleted,
  detectKdaAdaptive,
  detectCsBehind,
  detectGold,
  detectVision,
  detectTabCheck,
] as const;
