import { describe, it, expect } from 'vitest';
import {
  detectTeamfight,
  detectHpCritical,
  detectEnemyDeathWindow,
  detectItemCompleted,
  detectKdaAdaptive,
} from './detectors.js';
import type { GameSnapshot, Player } from '../riot.types.js';
import { initialContextState, type ContextState } from './context.js';

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

function makePlayer(overrides: Partial<Player> = {}): Player {
  return {
    championName: 'Sylas',
    isBot: false,
    isDead: false,
    items: [],
    level: 1,
    position: 'MIDDLE',
    respawnTimer: 0,
    riotId: 'Player#123',
    riotIdGameName: 'Player',
    riotIdTagLine: '123',
    runes: defaultRunes,
    scores: { ...defaultScores },
    summonerSpells: defaultSpells,
    team: 'ORDER',
    ...overrides,
  };
}

function makeEnemyPlayer(overrides: Partial<Player> = {}): Player {
  return makePlayer({
    championName: 'Zed',
    riotId: 'Enemy#456',
    riotIdGameName: 'Enemy',
    riotIdTagLine: '456',
    team: 'CHAOS',
    ...overrides,
  });
}

function makeSnapshot(
  overrides: {
    gameTime?: number;
    currentHealth?: number;
    maxHealth?: number;
    gold?: number;
    level?: number;
    allPlayers?: Player[];
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
        currentHealth: overrides.currentHealth ?? 700,
        healShieldPower: 0,
        healthRegenRate: 1.8,
        lifeSteal: 0,
        magicLethality: 0,
        magicPenetrationFlat: 0,
        magicPenetrationPercent: 1,
        magicResist: 32,
        maxHealth: overrides.maxHealth ?? 700,
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
    allPlayers: overrides.allPlayers ?? [
      makePlayer(),
      makeEnemyPlayer(),
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

function makeInput(
  snapshotOverrides: Parameters<typeof makeSnapshot>[0] = {},
  stateOverrides: Partial<ContextState> = {},
  meOverride?: Player | undefined,
  enemyLanerOverride?: Player | undefined,
) {
  const snapshot = makeSnapshot(snapshotOverrides);
  const state = makeState(stateOverrides);
  const newState = { ...state };
  const me =
    meOverride !== undefined
      ? meOverride
      : snapshot.allPlayers.find(
          (p) => p.riotId === snapshot.activePlayer.riotId,
        );
  const enemyLaner =
    enemyLanerOverride !== undefined
      ? enemyLanerOverride
      : me
        ? snapshot.allPlayers.find(
            (p) => p.position === me.position && p.team !== me.team,
          )
        : undefined;

  return { snapshot, me, enemyLaner, newEvents: snapshot.events.Events, state, newState };
}

// =========================================================
// detectTeamfight
// =========================================================
describe('detectTeamfight', () => {
  it('returns teamfight_won when our team has more kills', () => {
    const me = makePlayer();
    const ally = makePlayer({
      championName: 'Garen',
      riotId: 'Ally#789',
      riotIdGameName: 'Ally',
      riotIdTagLine: '789',
      position: 'TOP',
    });
    const enemy1 = makeEnemyPlayer();
    const enemy2 = makeEnemyPlayer({
      championName: 'Ahri',
      riotId: 'Enemy2#111',
      riotIdGameName: 'Enemy2',
      riotIdTagLine: '111',
      position: 'TOP',
    });

    const events = [
      { EventID: 1, EventName: 'ChampionKill', EventTime: 295, KillerName: 'Player' },
      { EventID: 2, EventName: 'ChampionKill', EventTime: 296, KillerName: 'Ally' },
      { EventID: 3, EventName: 'ChampionKill', EventTime: 297, KillerName: 'Player' },
    ];

    const input = makeInput(
      { gameTime: 300, allPlayers: [me, ally, enemy1, enemy2], events },
    );
    const result = detectTeamfight(input);
    expect(result).not.toBeNull();
    expect(result!.reason).toBe('teamfight_won');
    expect(result!.priority).toBe(90);
    expect(result!.data.total_kills).toBe('3');
    expect(result!.data.our_kills).toBe('3');
  });

  it('returns teamfight_lost when enemy team has more kills', () => {
    const me = makePlayer();
    const enemy1 = makeEnemyPlayer();
    const enemy2 = makeEnemyPlayer({
      championName: 'Ahri',
      riotId: 'Enemy2#111',
      riotIdGameName: 'Enemy2',
      riotIdTagLine: '111',
      position: 'TOP',
    });

    const events = [
      { EventID: 1, EventName: 'ChampionKill', EventTime: 295, KillerName: 'Enemy' },
      { EventID: 2, EventName: 'ChampionKill', EventTime: 296, KillerName: 'Enemy2' },
      { EventID: 3, EventName: 'ChampionKill', EventTime: 297, KillerName: 'Enemy' },
    ];

    const input = makeInput(
      { gameTime: 300, allPlayers: [me, enemy1, enemy2], events },
    );
    const result = detectTeamfight(input);
    expect(result).not.toBeNull();
    expect(result!.reason).toBe('teamfight_lost');
  });

  it('returns null when fewer than 3 recent kills', () => {
    const events = [
      { EventID: 1, EventName: 'ChampionKill', EventTime: 295, KillerName: 'Player' },
      { EventID: 2, EventName: 'ChampionKill', EventTime: 296, KillerName: 'Enemy' },
    ];
    const input = makeInput({ gameTime: 300, events });
    expect(detectTeamfight(input)).toBeNull();
  });

  it('returns null when me is undefined', () => {
    const events = [
      { EventID: 1, EventName: 'ChampionKill', EventTime: 295, KillerName: 'A' },
      { EventID: 2, EventName: 'ChampionKill', EventTime: 296, KillerName: 'B' },
      { EventID: 3, EventName: 'ChampionKill', EventTime: 297, KillerName: 'C' },
    ];
    const snapshot = makeSnapshot({ gameTime: 300, events });
    const state = makeState();
    const newState = { ...state };
    const input = { snapshot, me: undefined, enemyLaner: undefined, newEvents: events, state, newState };
    expect(detectTeamfight(input)).toBeNull();
  });

  it('ignores kills older than 10 seconds', () => {
    const events = [
      { EventID: 1, EventName: 'ChampionKill', EventTime: 280, KillerName: 'Player' },
      { EventID: 2, EventName: 'ChampionKill', EventTime: 281, KillerName: 'Player' },
      { EventID: 3, EventName: 'ChampionKill', EventTime: 295, KillerName: 'Player' },
    ];
    // Only 1 kill is within 10s of gameTime 300
    const input = makeInput({ gameTime: 300, events });
    expect(detectTeamfight(input)).toBeNull();
  });
});

// =========================================================
// detectHpCritical
// =========================================================
describe('detectHpCritical', () => {
  it('returns hp_critical when HP is below 30%', () => {
    const input = makeInput({ currentHealth: 100, maxHealth: 700 });
    const result = detectHpCritical(input);
    expect(result).not.toBeNull();
    expect(result!.reason).toBe('hp_critical');
    expect(result!.category).toBe('reset_timing');
    expect(result!.priority).toBe(75);
    expect(result!.data.hp_percent).toBe('14');
  });

  it('returns null when HP is at or above 30%', () => {
    const input = makeInput({ currentHealth: 210, maxHealth: 700 });
    expect(detectHpCritical(input)).toBeNull();
  });

  it('returns null when maxHealth is 0', () => {
    const input = makeInput({ currentHealth: 0, maxHealth: 0 });
    expect(detectHpCritical(input)).toBeNull();
  });

  it('returns null when player is dead with low HP', () => {
    const me = makePlayer({ isDead: true });
    const input = makeInput(
      { currentHealth: 0, maxHealth: 700, allPlayers: [me, makeEnemyPlayer()] },
    );
    expect(detectHpCritical(input)).toBeNull();
  });

  it('returns hp_critical at boundary (29%)', () => {
    // 29% of 1000 = 290
    const input = makeInput({ currentHealth: 290, maxHealth: 1000 });
    const result = detectHpCritical(input);
    expect(result).not.toBeNull();
    expect(result!.data.hp_percent).toBe('29');
  });

  it('returns null at exactly 30%', () => {
    const input = makeInput({ currentHealth: 300, maxHealth: 1000 });
    expect(detectHpCritical(input)).toBeNull();
  });
});

// =========================================================
// detectEnemyDeathWindow
// =========================================================
describe('detectEnemyDeathWindow', () => {
  it('returns enemy_dead when an enemy has respawnTimer > 5', () => {
    const me = makePlayer();
    const deadEnemy = makeEnemyPlayer({
      isDead: true,
      respawnTimer: 30,
      championName: 'Zed',
    });

    const input = makeInput(
      { allPlayers: [me, deadEnemy] },
    );
    const result = detectEnemyDeathWindow(input);
    expect(result).not.toBeNull();
    expect(result!.reason).toBe('enemy_dead');
    expect(result!.category).toBe('macro');
    expect(result!.priority).toBe(70);
    expect(result!.data.dead_enemy).toBe('Zed');
    expect(result!.data.respawn_timer).toBe('30');
    expect(result!.data.dead_count).toBe('1');
  });

  it('picks the enemy with the longest respawn timer', () => {
    const me = makePlayer();
    const dead1 = makeEnemyPlayer({
      isDead: true,
      respawnTimer: 15,
      championName: 'Ahri',
      position: 'TOP',
    });
    const dead2 = makeEnemyPlayer({
      isDead: true,
      respawnTimer: 40,
      championName: 'Thresh',
      position: 'BOTTOM',
    });

    const input = makeInput(
      { allPlayers: [me, dead1, dead2] },
    );
    const result = detectEnemyDeathWindow(input);
    expect(result).not.toBeNull();
    expect(result!.data.dead_enemy).toBe('Thresh');
    expect(result!.data.respawn_timer).toBe('40');
    expect(result!.data.dead_count).toBe('2');
  });

  it('returns null when no enemies are dead', () => {
    const input = makeInput();
    expect(detectEnemyDeathWindow(input)).toBeNull();
  });

  it('returns null when dead enemy has respawnTimer <= 5', () => {
    const me = makePlayer();
    const deadEnemy = makeEnemyPlayer({
      isDead: true,
      respawnTimer: 3,
    });

    const input = makeInput(
      { allPlayers: [me, deadEnemy] },
    );
    expect(detectEnemyDeathWindow(input)).toBeNull();
  });

  it('returns null when me is undefined', () => {
    const snapshot = makeSnapshot();
    const state = makeState();
    const newState = { ...state };
    const input = { snapshot, me: undefined, enemyLaner: undefined, newEvents: [], state, newState };
    expect(detectEnemyDeathWindow(input)).toBeNull();
  });
});

// =========================================================
// detectItemCompleted
// =========================================================
describe('detectItemCompleted', () => {
  it('returns item_completed when player gains a new real item', () => {
    const me = makePlayer({
      items: [
        {
          canUse: true,
          consumable: false,
          count: 1,
          displayName: 'Infinity Edge',
          itemID: 3031,
          price: 3400,
          rawDescription: '',
          rawDisplayName: '',
          slot: 0,
        },
        {
          canUse: true,
          consumable: false,
          count: 1,
          displayName: 'Berserker Greaves',
          itemID: 3006,
          price: 1100,
          rawDescription: '',
          rawDisplayName: '',
          slot: 1,
        },
      ],
    });

    const input = makeInput(
      { allPlayers: [me, makeEnemyPlayer()] },
      { lastMyItemIds: [3031] },
    );
    const result = detectItemCompleted(input);
    expect(result).not.toBeNull();
    expect(result!.reason).toBe('item_completed');
    expect(result!.category).toBe('trading');
    expect(result!.data.item).toBe('Berserker Greaves');
  });

  it('returns enemy_item_completed when enemy laner gains a new item', () => {
    const me = makePlayer({
      items: [
        {
          canUse: true,
          consumable: false,
          count: 1,
          displayName: 'Infinity Edge',
          itemID: 3031,
          price: 3400,
          rawDescription: '',
          rawDisplayName: '',
          slot: 0,
        },
      ],
    });
    const enemy = makeEnemyPlayer({
      items: [
        {
          canUse: true,
          consumable: false,
          count: 1,
          displayName: 'Duskblade',
          itemID: 6691,
          price: 3200,
          rawDescription: '',
          rawDisplayName: '',
          slot: 0,
        },
        {
          canUse: true,
          consumable: false,
          count: 1,
          displayName: 'Youmuus',
          itemID: 3142,
          price: 2900,
          rawDescription: '',
          rawDisplayName: '',
          slot: 1,
        },
      ],
    });

    const input = makeInput(
      { allPlayers: [me, enemy] },
      { lastMyItemIds: [3031], lastEnemyItemIds: [6691] },
    );
    const result = detectItemCompleted(input);
    expect(result).not.toBeNull();
    expect(result!.reason).toBe('enemy_item_completed');
    expect(result!.data.item).toBe('Youmuus');
    expect(result!.data.enemy).toBe('Zed');
  });

  it('returns null when no item change', () => {
    const me = makePlayer({
      items: [
        {
          canUse: true,
          consumable: false,
          count: 1,
          displayName: 'Infinity Edge',
          itemID: 3031,
          price: 3400,
          rawDescription: '',
          rawDisplayName: '',
          slot: 0,
        },
      ],
    });

    const input = makeInput(
      { allPlayers: [me, makeEnemyPlayer()] },
      { lastMyItemIds: [3031] },
    );
    expect(detectItemCompleted(input)).toBeNull();
  });

  it('returns null when me is undefined', () => {
    const snapshot = makeSnapshot();
    const state = makeState();
    const newState = { ...state };
    const input = { snapshot, me: undefined, enemyLaner: undefined, newEvents: [], state, newState };
    expect(detectItemCompleted(input)).toBeNull();
  });

  it('ignores consumable items and ward trinket', () => {
    const me = makePlayer({
      items: [
        {
          canUse: true,
          consumable: true,
          count: 1,
          displayName: 'Health Potion',
          itemID: 2003,
          price: 50,
          rawDescription: '',
          rawDisplayName: '',
          slot: 0,
        },
        {
          canUse: true,
          consumable: false,
          count: 1,
          displayName: 'Warding Totem',
          itemID: 3340,
          price: 0,
          rawDescription: '',
          rawDisplayName: '',
          slot: 6,
        },
      ],
    });

    const input = makeInput(
      { allPlayers: [me, makeEnemyPlayer()] },
      { lastMyItemIds: [] },
    );
    // No real items (consumable + ward trinket filtered), so item count goes from 0 to 0
    expect(detectItemCompleted(input)).toBeNull();
  });

  it('returns null when lastMyItemIds is empty (first check)', () => {
    const me = makePlayer({
      items: [
        {
          canUse: true,
          consumable: false,
          count: 1,
          displayName: 'Infinity Edge',
          itemID: 3031,
          price: 3400,
          rawDescription: '',
          rawDisplayName: '',
          slot: 0,
        },
      ],
    });

    const input = makeInput(
      { allPlayers: [me, makeEnemyPlayer()] },
      { lastMyItemIds: [] },
    );
    // state.lastMyItemIds.length is 0, so skip my item check
    expect(detectItemCompleted(input)).toBeNull();
  });
});

// =========================================================
// detectKdaAdaptive
// =========================================================
describe('detectKdaAdaptive', () => {
  it('returns feeding when deaths >= 3, kills = 0, assists <= 1', () => {
    const me = makePlayer({
      scores: { ...defaultScores, deaths: 4, kills: 0, assists: 1 },
    });

    const input = makeInput(
      { allPlayers: [me, makeEnemyPlayer()] },
    );
    const result = detectKdaAdaptive(input);
    expect(result).not.toBeNull();
    expect(result!.reason).toBe('feeding');
    expect(result!.category).toBe('mental');
    expect(result!.priority).toBe(60);
    expect(result!.data.deaths).toBe('4');
  });

  it('returns fed when kills >= 3, deaths <= 1', () => {
    const me = makePlayer({
      scores: { ...defaultScores, kills: 5, deaths: 0 },
    });

    const input = makeInput(
      { allPlayers: [me, makeEnemyPlayer()] },
    );
    const result = detectKdaAdaptive(input);
    expect(result).not.toBeNull();
    expect(result!.reason).toBe('fed');
    expect(result!.category).toBe('macro');
    expect(result!.priority).toBe(55);
    expect(result!.data.kills).toBe('5');
  });

  it('returns null for neutral KDA', () => {
    const me = makePlayer({
      scores: { ...defaultScores, kills: 2, deaths: 2 },
    });

    const input = makeInput(
      { allPlayers: [me, makeEnemyPlayer()] },
    );
    expect(detectKdaAdaptive(input)).toBeNull();
  });

  it('returns null when me is undefined', () => {
    const snapshot = makeSnapshot();
    const state = makeState();
    const newState = { ...state };
    const input = { snapshot, me: undefined, enemyLaner: undefined, newEvents: [], state, newState };
    expect(detectKdaAdaptive(input)).toBeNull();
  });

  it('does not return feeding when assists > 1', () => {
    const me = makePlayer({
      scores: { ...defaultScores, deaths: 4, kills: 0, assists: 3 },
    });

    const input = makeInput(
      { allPlayers: [me, makeEnemyPlayer()] },
    );
    expect(detectKdaAdaptive(input)).toBeNull();
  });

  it('returns feeding at boundary (deaths=3, kills=0, assists=0)', () => {
    const me = makePlayer({
      scores: { ...defaultScores, deaths: 3, kills: 0, assists: 0 },
    });

    const input = makeInput(
      { allPlayers: [me, makeEnemyPlayer()] },
    );
    const result = detectKdaAdaptive(input);
    expect(result).not.toBeNull();
    expect(result!.reason).toBe('feeding');
  });

  it('returns fed at boundary (kills=3, deaths=1)', () => {
    const me = makePlayer({
      scores: { ...defaultScores, kills: 3, deaths: 1 },
    });

    const input = makeInput(
      { allPlayers: [me, makeEnemyPlayer()] },
    );
    const result = detectKdaAdaptive(input);
    expect(result).not.toBeNull();
    expect(result!.reason).toBe('fed');
  });
});
