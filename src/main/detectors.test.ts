import { describe, it, expect, beforeEach } from 'vitest';
import type { GameSnapshot, Player, GameEvent, Item } from '../riot.types.js';
import type { ContextState } from './context.js';
import type { DetectorInput } from './detectors.js';
import {
  detectDeath,
  detectPlayerKill,
  detectObjectiveTaken,
  detectTeamfight,
  detectHpCritical,
  detectEnemyDeathWindow,
  detectItemCompleted,
  detectKdaAdaptive,
  detectObjectiveUpcoming,
  detectCsBehind,
  detectGold,
  detectLevelSpike,
  detectVision,
  detectTabCheck,
} from './detectors.js';

function makeItem(
  overrides: Partial<Item> & { itemID: number; displayName: string },
): Item {
  return {
    canUse: false,
    consumable: false,
    count: 1,
    price: 0,
    rawDescription: '',
    rawDisplayName: '',
    slot: 0,
    ...overrides,
  };
}

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
    isEnemyDead?: boolean;
    enemyRespawnTimer?: number;
    currentHealth?: number;
    maxHealth?: number;
    kills?: number;
    deaths?: number;
    assists?: number;
    myItems?: Player['items'];
    enemyItems?: Player['items'];
    events?: GameEvent[];
    myCs?: number;
    enemyCs?: number;
  } = {},
): GameSnapshot {
  const gameTime = overrides.gameTime ?? 300;
  const isDead = overrides.isDead ?? false;
  const isEnemyDead = overrides.isEnemyDead ?? false;
  const kills = overrides.kills ?? 0;
  const deaths = overrides.deaths ?? 0;
  const assists = overrides.assists ?? 0;
  const currentHealth = overrides.currentHealth ?? 700;
  const maxHealth = overrides.maxHealth ?? 700;
  const myCs = overrides.myCs ?? 45;
  const enemyCs = overrides.enemyCs ?? 45;

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
        currentHealth,
        maxHealth,
        healShieldPower: 0,
        healthRegenRate: 1.8,
        lifeSteal: 0,
        magicLethality: 0,
        magicPenetrationFlat: 0,
        magicPenetrationPercent: 1,
        magicResist: 32,
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
        isDead,
        items: overrides.myItems ?? [],
        level: overrides.level ?? 1,
        position: 'MIDDLE',
        respawnTimer: isDead ? 10 : 0,
        riotId: 'Player#123',
        riotIdGameName: 'Player',
        riotIdTagLine: '123',
        runes: defaultRunes,
        scores: { ...defaultScores, kills, deaths, assists, creepScore: myCs },
        summonerSpells: defaultSpells,
        team: 'ORDER',
      },
      {
        championName: 'Zed',
        isBot: false,
        isDead: isEnemyDead,
        items: overrides.enemyItems ?? [],
        level: overrides.level ?? 1,
        position: 'MIDDLE',
        respawnTimer: overrides.enemyRespawnTimer ?? 0,
        riotId: 'Enemy#456',
        riotIdGameName: 'Enemy',
        riotIdTagLine: '456',
        runes: defaultRunes,
        scores: { ...defaultScores, kills: 0, deaths: 0, creepScore: enemyCs },
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

function makeInput(
  snapshot: GameSnapshot,
  state: ContextState,
  newState: ContextState,
  newEvents: GameEvent[] = snapshot.events.Events,
): DetectorInput {
  const me = snapshot.allPlayers.find(
    (p) => p.riotId === snapshot.activePlayer.riotId,
  );
  const enemyLaner = me
    ? snapshot.allPlayers.find(
        (p) => p.position === me.position && p.team !== me.team,
      )
    : undefined;
  return { snapshot, me, enemyLaner, newEvents, state, newState };
}

function makeState(overrides: Partial<ContextState> = {}): ContextState {
  return {
    lastEventId: 0,
    lastTabCheckAt: 200,
    lastVisionCheckAt: 200,
    lastKnownLevel: 1,
    lastDragonKillTime: 0,
    lastBaronKillTime: 0,
    lastMyItemIds: [],
    lastEnemyItemIds: [],
    ...overrides,
  };
}

describe('detectDeath', () => {
  it('returns mental when player is dead', () => {
    const snap = makeSnapshot({ isDead: true });
    const input = makeInput(snap, makeState(), makeState());
    const result = detectDeath(input);
    expect(result).not.toBeNull();
    expect(result!.category).toBe('mental');
    expect(result!.reason).toBe('player_dead');
    expect(result!.priority).toBe(95);
  });

  it('returns null when player is alive', () => {
    const snap = makeSnapshot({ isDead: false });
    const input = makeInput(snap, makeState(), makeState());
    expect(detectDeath(input)).toBeNull();
  });
});

describe('detectPlayerKill', () => {
  it('returns macro when player gets a kill', () => {
    const snap = makeSnapshot({
      events: [
        {
          EventID: 1,
          EventName: 'ChampionKill',
          EventTime: 300,
          KillerName: 'Player',
          VictimName: 'Enemy',
        },
      ],
    });
    const input = makeInput(snap, makeState(), makeState(), snap.events.Events);
    const result = detectPlayerKill(input);
    expect(result).not.toBeNull();
    expect(result!.category).toBe('macro');
    expect(result!.reason).toBe('player_kill');
    expect(result!.data.victim).toBe('Enemy');
  });

  it('returns null when someone else gets the kill', () => {
    const snap = makeSnapshot({
      events: [
        {
          EventID: 1,
          EventName: 'ChampionKill',
          EventTime: 300,
          KillerName: 'SomeoneElse',
        },
      ],
    });
    const input = makeInput(snap, makeState(), makeState(), snap.events.Events);
    expect(detectPlayerKill(input)).toBeNull();
  });
});

describe('detectObjectiveTaken', () => {
  it('returns objectives for DragonKill', () => {
    const snap = makeSnapshot({
      events: [{ EventID: 1, EventName: 'DragonKill', EventTime: 300 }],
    });
    const input = makeInput(snap, makeState(), makeState(), snap.events.Events);
    const result = detectObjectiveTaken(input);
    expect(result).not.toBeNull();
    expect(result!.category).toBe('objectives');
    expect(result!.data.objective).toBe('DragonKill');
  });

  it('returns objectives for TurretKilled', () => {
    const snap = makeSnapshot({
      events: [{ EventID: 1, EventName: 'TurretKilled', EventTime: 300 }],
    });
    const input = makeInput(snap, makeState(), makeState(), snap.events.Events);
    const result = detectObjectiveTaken(input);
    expect(result).not.toBeNull();
    expect(result!.category).toBe('objectives');
  });

  it('returns null when no objective event', () => {
    const snap = makeSnapshot({ events: [] });
    const input = makeInput(snap, makeState(), makeState(), snap.events.Events);
    expect(detectObjectiveTaken(input)).toBeNull();
  });
});

describe('detectTeamfight', () => {
  it('returns macro when teamfight is won (3+ kills, more from our team)', () => {
    const snap = makeSnapshot({
      events: [
        {
          EventID: 1,
          EventName: 'ChampionKill',
          EventTime: 295,
          KillerName: 'Player',
        },
        {
          EventID: 2,
          EventName: 'ChampionKill',
          EventTime: 296,
          KillerName: 'Player',
        },
        {
          EventID: 3,
          EventName: 'ChampionKill',
          EventTime: 297,
          KillerName: 'Enemy',
        },
      ],
      gameTime: 300,
    });
    const input = makeInput(snap, makeState(), makeState(), snap.events.Events);
    const result = detectTeamfight(input);
    expect(result).not.toBeNull();
    expect(result!.category).toBe('macro');
    expect(result!.reason).toBe('teamfight_won');
  });

  it('returns macro when teamfight is lost', () => {
    const snap = makeSnapshot({
      events: [
        {
          EventID: 1,
          EventName: 'ChampionKill',
          EventTime: 295,
          KillerName: 'Enemy',
        },
        {
          EventID: 2,
          EventName: 'ChampionKill',
          EventTime: 296,
          KillerName: 'Enemy',
        },
        {
          EventID: 3,
          EventName: 'ChampionKill',
          EventTime: 297,
          KillerName: 'Player',
        },
      ],
      gameTime: 300,
    });
    const input = makeInput(snap, makeState(), makeState(), snap.events.Events);
    const result = detectTeamfight(input);
    expect(result).not.toBeNull();
    expect(result!.reason).toBe('teamfight_lost');
  });

  it('returns null when fewer than 3 kills', () => {
    const snap = makeSnapshot({
      events: [
        {
          EventID: 1,
          EventName: 'ChampionKill',
          EventTime: 295,
          KillerName: 'Player',
        },
        {
          EventID: 2,
          EventName: 'ChampionKill',
          EventTime: 296,
          KillerName: 'Enemy',
        },
      ],
      gameTime: 300,
    });
    const input = makeInput(snap, makeState(), makeState(), snap.events.Events);
    expect(detectTeamfight(input)).toBeNull();
  });
});

describe('detectHpCritical', () => {
  it('returns reset_timing when HP is below 30%', () => {
    const snap = makeSnapshot({ currentHealth: 150, maxHealth: 700 });
    const input = makeInput(snap, makeState(), makeState());
    const result = detectHpCritical(input);
    expect(result).not.toBeNull();
    expect(result!.category).toBe('reset_timing');
    expect(result!.reason).toBe('hp_critical');
  });

  it('returns null when HP is above 30%', () => {
    const snap = makeSnapshot({ currentHealth: 250, maxHealth: 700 });
    const input = makeInput(snap, makeState(), makeState());
    expect(detectHpCritical(input)).toBeNull();
  });

  it('returns null when player is dead', () => {
    const snap = makeSnapshot({
      currentHealth: 50,
      maxHealth: 700,
      isDead: true,
    });
    const input = makeInput(snap, makeState(), makeState());
    expect(detectHpCritical(input)).toBeNull();
  });

  it('returns null when maxHealth is 0', () => {
    const snap = makeSnapshot({ currentHealth: 0, maxHealth: 0 });
    const input = makeInput(snap, makeState(), makeState());
    expect(detectHpCritical(input)).toBeNull();
  });
});

describe('detectEnemyDeathWindow', () => {
  it('returns macro when enemy is dead with respawn timer', () => {
    const snap = makeSnapshot({ isEnemyDead: true, enemyRespawnTimer: 15 });
    const input = makeInput(snap, makeState(), makeState());
    const result = detectEnemyDeathWindow(input);
    expect(result).not.toBeNull();
    expect(result!.category).toBe('macro');
    expect(result!.reason).toBe('enemy_dead');
  });

  it('returns null when no enemy is dead', () => {
    const snap = makeSnapshot({ isEnemyDead: false });
    const input = makeInput(snap, makeState(), makeState());
    expect(detectEnemyDeathWindow(input)).toBeNull();
  });

  it('returns null when enemy respawn timer is short', () => {
    const snap = makeSnapshot({ isEnemyDead: true, enemyRespawnTimer: 3 });
    const input = makeInput(snap, makeState(), makeState());
    expect(detectEnemyDeathWindow(input)).toBeNull();
  });
});

describe('detectItemCompleted', () => {
  it('returns trading when player completes a new item', () => {
    const snap = makeSnapshot({
      myItems: [
        makeItem({ itemID: 1001, displayName: 'Boots' }),
        makeItem({ itemID: 6691, displayName: "Doran's Blade" }),
      ],
    });
    const prevState = makeState({ lastMyItemIds: [1001] });
    const newState = makeState({ lastMyItemIds: [1001] });
    const input = makeInput(snap, prevState, newState);
    const result = detectItemCompleted(input);
    expect(result).not.toBeNull();
    expect(result!.category).toBe('trading');
    expect(result!.reason).toBe('item_completed');
    expect(result!.data.item).toBe("Doran's Blade");
  });

  it('returns trading when enemy completes a new item', () => {
    const snap = makeSnapshot({
      enemyItems: [
        makeItem({ itemID: 1001, displayName: 'Boots' }),
        makeItem({ itemID: 6691, displayName: 'Long Sword' }),
      ],
    });
    const prevState = makeState({ lastEnemyItemIds: [1001] });
    const newState = makeState({ lastEnemyItemIds: [1001] });
    const input = makeInput(snap, prevState, newState);
    const result = detectItemCompleted(input);
    expect(result).not.toBeNull();
    expect(result!.reason).toBe('enemy_item_completed');
  });

  it('filters out consumables', () => {
    const snap = makeSnapshot({
      myItems: [
        makeItem({
          itemID: 2003,
          displayName: 'Health Potion',
          consumable: true,
        }),
      ],
    });
    const prevState = makeState({ lastMyItemIds: [] });
    const newState = makeState({ lastMyItemIds: [] });
    const input = makeInput(snap, prevState, newState);
    expect(detectItemCompleted(input)).toBeNull();
  });

  it('filters out warding items (itemID 3340)', () => {
    const snap = makeSnapshot({
      myItems: [makeItem({ itemID: 3340, displayName: 'Control Ward' })],
    });
    const prevState = makeState({ lastMyItemIds: [] });
    const newState = makeState({ lastMyItemIds: [] });
    const input = makeInput(snap, prevState, newState);
    expect(detectItemCompleted(input)).toBeNull();
  });
});

describe('detectKdaAdaptive', () => {
  it('returns mental when feeding (0/3+)', () => {
    const snap = makeSnapshot({ kills: 0, deaths: 3, assists: 0 });
    const input = makeInput(snap, makeState(), makeState());
    const result = detectKdaAdaptive(input);
    expect(result).not.toBeNull();
    expect(result!.category).toBe('mental');
    expect(result!.reason).toBe('feeding');
  });

  it('returns macro when fed (3+/0-1)', () => {
    const snap = makeSnapshot({ kills: 4, deaths: 1 });
    const input = makeInput(snap, makeState(), makeState());
    const result = detectKdaAdaptive(input);
    expect(result).not.toBeNull();
    expect(result!.category).toBe('macro');
    expect(result!.reason).toBe('fed');
  });

  it('returns null for normal KDA', () => {
    const snap = makeSnapshot({ kills: 2, deaths: 2 });
    const input = makeInput(snap, makeState(), makeState());
    expect(detectKdaAdaptive(input)).toBeNull();
  });
});

describe('detectObjectiveUpcoming', () => {
  it('returns baron_upcoming before first baron spawn', () => {
    const snap = makeSnapshot({ gameTime: 1150 });
    const input = makeInput(
      snap,
      makeState({ lastBaronKillTime: 0 }),
      makeState({ lastBaronKillTime: 0 }),
    );
    const result = detectObjectiveUpcoming(input);
    expect(result).not.toBeNull();
    expect(result!.reason).toBe('baron_upcoming');
  });

  it('returns dragon_upcoming before first dragon spawn', () => {
    const snap = makeSnapshot({ gameTime: 250 });
    const input = makeInput(
      snap,
      makeState({ lastDragonKillTime: 0 }),
      makeState({ lastDragonKillTime: 0 }),
    );
    const result = detectObjectiveUpcoming(input);
    expect(result).not.toBeNull();
    expect(result!.reason).toBe('dragon_upcoming');
  });

  it('returns null when no objective is upcoming', () => {
    const snap = makeSnapshot({ gameTime: 100 });
    const input = makeInput(snap, makeState(), makeState());
    expect(detectObjectiveUpcoming(input)).toBeNull();
  });
});

describe('detectCsBehind', () => {
  it('returns wave_management when CS is behind expected', () => {
    const snap = makeSnapshot({ gameTime: 300, myCs: 30, enemyCs: 50 });
    const input = makeInput(snap, makeState(), makeState());
    const result = detectCsBehind(input);
    expect(result).not.toBeNull();
    expect(result!.category).toBe('wave_management');
    expect(result!.reason).toBe('cs_behind');
  });

  it('skips check early game (expected CS <= 20)', () => {
    const snap = makeSnapshot({ gameTime: 60, myCs: 3, enemyCs: 10 });
    const input = makeInput(snap, makeState(), makeState());
    expect(detectCsBehind(input)).toBeNull();
  });

  it('returns null when CS is good', () => {
    const snap = makeSnapshot({ gameTime: 300, myCs: 50, enemyCs: 48 });
    const input = makeInput(snap, makeState(), makeState());
    expect(detectCsBehind(input)).toBeNull();
  });
});

describe('detectGold', () => {
  it('returns reset_timing in recall gold window', () => {
    const snap = makeSnapshot({ gold: 1400 });
    const input = makeInput(snap, makeState(), makeState());
    const result = detectGold(input);
    expect(result).not.toBeNull();
    expect(result!.category).toBe('reset_timing');
    expect(result!.reason).toBe('recall_window');
  });

  it('returns reset_timing when sitting on gold', () => {
    const snap = makeSnapshot({ gold: 3000 });
    const input = makeInput(snap, makeState(), makeState());
    const result = detectGold(input);
    expect(result).not.toBeNull();
    expect(result!.reason).toBe('sitting_on_gold');
  });

  it('returns null when gold is low', () => {
    const snap = makeSnapshot({ gold: 500 });
    const input = makeInput(snap, makeState(), makeState());
    expect(detectGold(input)).toBeNull();
  });
});

describe('detectLevelSpike', () => {
  it('returns trading on level 6 spike', () => {
    const snap = makeSnapshot({ level: 6 });
    const input = makeInput(
      snap,
      makeState({ lastKnownLevel: 5 }),
      makeState({ lastKnownLevel: 5 }),
    );
    const result = detectLevelSpike(input);
    expect(result).not.toBeNull();
    expect(result!.category).toBe('trading');
    expect(result!.reason).toBe('level_6');
  });

  it('returns null for non-spike levels', () => {
    const snap = makeSnapshot({ level: 4 });
    const input = makeInput(
      snap,
      makeState({ lastKnownLevel: 3 }),
      makeState({ lastKnownLevel: 3 }),
    );
    expect(detectLevelSpike(input)).toBeNull();
  });

  it('returns null when level unchanged', () => {
    const snap = makeSnapshot({ level: 6 });
    const input = makeInput(
      snap,
      makeState({ lastKnownLevel: 6 }),
      makeState({ lastKnownLevel: 6 }),
    );
    expect(detectLevelSpike(input)).toBeNull();
  });
});

describe('detectVision', () => {
  it('returns vision after interval passes', () => {
    const snap = makeSnapshot({ gameTime: 500 });
    const input = makeInput(
      snap,
      makeState({ lastVisionCheckAt: 200 }),
      makeState({ lastVisionCheckAt: 200 }),
    );
    const result = detectVision(input);
    expect(result).not.toBeNull();
    expect(result!.category).toBe('vision');
    expect(result!.reason).toBe('periodic');
    expect(result!.stateUpdates).toEqual({ lastVisionCheckAt: 500 });
  });

  it('returns null when interval not reached', () => {
    const snap = makeSnapshot({ gameTime: 300 });
    const input = makeInput(
      snap,
      makeState({ lastVisionCheckAt: 200 }),
      makeState({ lastVisionCheckAt: 200 }),
    );
    expect(detectVision(input)).toBeNull();
  });
});

describe('detectTabCheck', () => {
  it('returns tab_check after interval passes', () => {
    const snap = makeSnapshot({ gameTime: 400 });
    const input = makeInput(
      snap,
      makeState({ lastTabCheckAt: 200 }),
      makeState({ lastTabCheckAt: 200 }),
    );
    const result = detectTabCheck(input);
    expect(result).not.toBeNull();
    expect(result!.category).toBe('tab_check');
    expect(result!.reason).toBe('periodic');
    expect(result!.stateUpdates).toEqual({ lastTabCheckAt: 400 });
  });

  it('returns null when interval not reached', () => {
    const snap = makeSnapshot({ gameTime: 300 });
    const input = makeInput(
      snap,
      makeState({ lastTabCheckAt: 200 }),
      makeState({ lastTabCheckAt: 200 }),
    );
    expect(detectTabCheck(input)).toBeNull();
  });
});
