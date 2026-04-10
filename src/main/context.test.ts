import { describe, it, expect } from 'vitest';
import {
  deriveContext,
  initialContextState,
  type ContextState,
} from './context.js';
import type { GameSnapshot, Player, Abilities } from '../riot.types.js';

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

// Base snapshot: 5 min in, normal game state, no events, no triggers
function makeSnapshot(
  overrides: {
    gameTime?: number;
    level?: number;
    gold?: number;
    isDead?: boolean;
    creepScore?: number;
    enemyCreepScore?: number;
    events?: GameSnapshot['events']['Events'];
    abilities?: Partial<
      Record<'Q' | 'W' | 'E' | 'R', Partial<Abilities['Q']>>
    >;
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
          abilityLevel: overrides.abilities?.Q?.abilityLevel ?? 1,
          displayName: 'Q',
          id: 'Q',
          rawDescription: '',
          rawDisplayName: '',
        },
        W: {
          abilityLevel: overrides.abilities?.W?.abilityLevel ?? 0,
          displayName: 'W',
          id: 'W',
          rawDescription: '',
          rawDisplayName: '',
        },
        E: {
          abilityLevel: overrides.abilities?.E?.abilityLevel ?? 0,
          displayName: 'E',
          id: 'E',
          rawDescription: '',
          rawDisplayName: '',
        },
        R: {
          abilityLevel: overrides.abilities?.R?.abilityLevel ?? 0,
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
        currentHealth: 700,
        healShieldPower: 0,
        healthRegenRate: 1.8,
        lifeSteal: 0,
        magicLethality: 0,
        magicPenetrationFlat: 0,
        magicPenetrationPercent: 1,
        magicResist: 32,
        maxHealth: 700,
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
        isDead: overrides.isDead ?? false,
        items: [],
        level: overrides.level ?? 1,
        position: 'MIDDLE',
        respawnTimer: 0,
        riotId: 'Player#123',
        riotIdGameName: 'Player',
        riotIdTagLine: '123',
        runes: defaultRunes,
        scores: {
          ...defaultScores,
          creepScore: overrides.creepScore ?? 45,
        },
        summonerSpells: defaultSpells,
        team: 'ORDER',
      },
      {
        championName: 'Zed',
        isBot: false,
        isDead: false,
        items: [],
        level: overrides.level ?? 1,
        position: 'MIDDLE',
        respawnTimer: 0,
        riotId: 'Enemy#456',
        riotIdGameName: 'Enemy',
        riotIdTagLine: '456',
        runes: defaultRunes,
        scores: {
          ...defaultScores,
          creepScore: overrides.enemyCreepScore ?? 45,
        },
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

// Base state: vision and tab checks recently done so they don't fire
function makeState(overrides: Partial<ContextState> = {}): ContextState {
  return {
    ...initialContextState,
    lastVisionCheckAt: 200,
    lastTabCheckAt: 200,
    ...overrides,
  };
}

describe('deriveContext', () => {
  // --- Signal 1: Death ---
  it('returns mental when player is dead', () => {
    const snap = makeSnapshot({ isDead: true });
    const { result } = deriveContext(snap, makeState());
    expect(result?.category).toBe('mental');
    expect(result?.reason).toBe('player_dead');
  });

  // --- Signal 2: Player kill ---
  it('returns macro when player gets a kill', () => {
    const snap = makeSnapshot({
      events: [
        {
          EventID: 1,
          EventName: 'ChampionKill',
          EventTime: 300,
          KillerName: 'Player',
        },
      ],
    });
    const { result } = deriveContext(snap, makeState());
    expect(result?.category).toBe('macro');
    expect(result?.reason).toBe('player_kill');
  });

  it('ignores kills by other players', () => {
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
    const { result } = deriveContext(snap, makeState());
    expect(result?.category).not.toBe('macro');
  });

  // --- Signal 3: Objective taken ---
  it('returns objectives when dragon is killed', () => {
    const snap = makeSnapshot({
      events: [{ EventID: 1, EventName: 'DragonKill', EventTime: 310 }],
    });
    const { result } = deriveContext(snap, makeState());
    expect(result?.category).toBe('objectives');
    expect(result?.reason).toBe('DragonKill');
  });

  it('returns objectives when turret is killed', () => {
    const snap = makeSnapshot({
      events: [{ EventID: 1, EventName: 'TurretKilled', EventTime: 300 }],
    });
    const { result } = deriveContext(snap, makeState());
    expect(result?.category).toBe('objectives');
  });

  // --- Signal 4: Baron upcoming ---
  it('returns objectives when baron is upcoming (first spawn)', () => {
    // Baron spawns at 1200s. Window: 1110-1190
    const snap = makeSnapshot({ gameTime: 1150 });
    const { result } = deriveContext(snap, makeState());
    expect(result?.category).toBe('objectives');
    expect(result?.reason).toBe('baron_upcoming');
  });

  it('does not fire baron upcoming before the window', () => {
    // 1100 is before the 1110 window start
    const snap = makeSnapshot({ gameTime: 1100 });
    const { result } = deriveContext(snap, makeState());
    expect(result?.reason).not.toBe('baron_upcoming');
  });

  it('does not fire baron upcoming after the window', () => {
    // 1195 is past nextSpawn - 10 (1190)
    const snap = makeSnapshot({ gameTime: 1195 });
    const { result } = deriveContext(snap, makeState());
    expect(result?.reason).not.toBe('baron_upcoming');
  });

  it('returns objectives for baron respawn after kill', () => {
    // Baron killed at 1250, respawn at 1250+420=1670, window: 1580-1660
    const snap = makeSnapshot({ gameTime: 1600 });
    const state = makeState({ lastBaronKillTime: 1250 });
    const { result } = deriveContext(snap, state);
    expect(result?.reason).toBe('baron_upcoming');
  });

  // --- Signal 5: Dragon upcoming ---
  it('returns objectives when dragon is upcoming (first spawn)', () => {
    // Dragon spawns at 300s. Window: 210-290
    const snap = makeSnapshot({ gameTime: 250 });
    const { result } = deriveContext(snap, makeState());
    expect(result?.category).toBe('objectives');
    expect(result?.reason).toBe('dragon_upcoming');
  });

  // --- Signal 6: CS behind ---
  it('returns wave_management when CS is behind', () => {
    // At 300s, expectedCS = 50, threshold = 37.5. Player at 30, enemy at 50.
    const snap = makeSnapshot({
      gameTime: 300,
      creepScore: 30,
      enemyCreepScore: 50,
    });
    const { result } = deriveContext(snap, makeState());
    expect(result?.category).toBe('wave_management');
    expect(result?.reason).toBe('cs_behind');
  });

  it('does not fire CS behind early game', () => {
    // At 60s, expectedCS = 10, which is <= 20, so the check is skipped
    const snap = makeSnapshot({
      gameTime: 60,
      creepScore: 3,
      enemyCreepScore: 10,
    });
    const { result } = deriveContext(snap, makeState());
    expect(result?.reason).not.toBe('cs_behind');
  });

  it('does not fire CS behind when close to enemy', () => {
    // Player at 36 CS, enemy at 37. 36 < 37.5 threshold but 36 >= 37-2 = 35
    const snap = makeSnapshot({
      gameTime: 300,
      creepScore: 36,
      enemyCreepScore: 37,
    });
    const { result } = deriveContext(snap, makeState());
    expect(result?.reason).not.toBe('cs_behind');
  });

  // --- Signal 7-8: Gold ---
  it('returns reset_timing in recall gold window', () => {
    const snap = makeSnapshot({ gold: 1400 });
    const { result } = deriveContext(snap, makeState());
    expect(result?.category).toBe('reset_timing');
    expect(result?.reason).toBe('recall_window');
  });

  it('returns reset_timing when sitting on gold', () => {
    const snap = makeSnapshot({ gold: 3000 });
    const { result } = deriveContext(snap, makeState());
    expect(result?.category).toBe('reset_timing');
    expect(result?.reason).toBe('sitting_on_gold');
  });

  // --- Signal 9: Level spike ---
  it('returns trading on level spike', () => {
    const snap = makeSnapshot({ level: 6 });
    const state = makeState({ lastKnownLevel: 5 });
    const { result } = deriveContext(snap, state);
    expect(result?.category).toBe('trading');
    expect(result?.reason).toBe('level_6');
  });

  it('does not fire trading on non-spike level', () => {
    const snap = makeSnapshot({ level: 4 });
    const state = makeState({ lastKnownLevel: 3 });
    const { result } = deriveContext(snap, state);
    expect(result?.reason).not.toMatch(/^level_/);
  });

  it('does not fire trading when level unchanged', () => {
    const snap = makeSnapshot({ level: 6 });
    const state = makeState({ lastKnownLevel: 6 });
    const { result } = deriveContext(snap, state);
    expect(result?.reason).not.toMatch(/^level_/);
  });

  // --- Signal: Ability spike ---
  it('seeds ability levels on first tick without firing', () => {
    const snap = makeSnapshot({
      level: 8,
      abilities: { Q: { abilityLevel: 3 }, R: { abilityLevel: 1 } },
    });
    // lastAbilityLevels is null (initial state) — first observation
    const state = makeState();
    const { result, newState } = deriveContext(snap, state);
    expect(result?.reason).not.toBe('ult_unlock');
    expect(result?.reason).not.toBe('ult_rank_up');
    expect(newState.lastAbilityLevels).toEqual({ Q: 3, W: 0, E: 0, R: 1 });
  });

  it('returns trading on ult unlock (R 0→1)', () => {
    const snap = makeSnapshot({
      level: 6,
      abilities: { R: { abilityLevel: 1 } },
    });
    const state = makeState({
      lastKnownLevel: 5,
      lastAbilityLevels: { Q: 3, W: 1, E: 1, R: 0 },
    });
    const { result } = deriveContext(snap, state);
    expect(result?.category).toBe('trading');
    expect(result?.reason).toBe('ult_unlock');
  });

  it('returns trading on ult rank up (R 1→2)', () => {
    const snap = makeSnapshot({
      level: 11,
      abilities: { R: { abilityLevel: 2 } },
    });
    const state = makeState({
      lastKnownLevel: 10,
      lastAbilityLevels: { Q: 4, W: 3, E: 3, R: 1 },
    });
    const { result } = deriveContext(snap, state);
    expect(result?.category).toBe('trading');
    expect(result?.reason).toBe('ult_rank_up');
  });

  it('does not fire ability spike when R level unchanged', () => {
    const snap = makeSnapshot({
      level: 7,
      abilities: { R: { abilityLevel: 1 } },
    });
    const state = makeState({
      lastKnownLevel: 6,
      lastAbilityLevels: { Q: 3, W: 2, E: 1, R: 1 },
    });
    const { result } = deriveContext(snap, state);
    expect(result?.reason).not.toBe('ult_unlock');
    expect(result?.reason).not.toBe('ult_rank_up');
  });

  it('updates lastAbilityLevels in state', () => {
    const snap = makeSnapshot({
      level: 6,
      abilities: {
        Q: { abilityLevel: 3 },
        W: { abilityLevel: 1 },
        E: { abilityLevel: 1 },
        R: { abilityLevel: 1 },
      },
    });
    const state = makeState({
      lastKnownLevel: 5,
      lastAbilityLevels: { Q: 3, W: 1, E: 1, R: 0 },
    });
    const { newState } = deriveContext(snap, state);
    expect(newState.lastAbilityLevels).toEqual({ Q: 3, W: 1, E: 1, R: 1 });
  });

  // --- Signal 10: Vision periodic ---
  it('returns vision after interval', () => {
    const snap = makeSnapshot({ gameTime: 300 });
    // lastVisionCheckAt = 0, so 300 - 0 = 300 >= 240
    const state = makeState({ lastVisionCheckAt: 0, lastTabCheckAt: 200 });
    const { result, newState } = deriveContext(snap, state);
    expect(result?.category).toBe('vision');
    expect(newState.lastVisionCheckAt).toBe(300);
  });

  // --- Signal 11: Tab check periodic ---
  it('returns tab_check after interval', () => {
    const snap = makeSnapshot({ gameTime: 300 });
    // Vision was recent (200), tab was long ago (0). 300 - 0 = 300 >= 180
    const state = makeState({ lastVisionCheckAt: 200, lastTabCheckAt: 0 });
    const { result, newState } = deriveContext(snap, state);
    expect(result?.category).toBe('tab_check');
    expect(newState.lastTabCheckAt).toBe(300);
  });

  // --- Signal 12: Fallback ---
  it('returns map_awareness as fallback', () => {
    const snap = makeSnapshot();
    const { result } = deriveContext(snap, makeState());
    expect(result?.category).toBe('map_awareness');
    expect(result?.reason).toBe('fallback');
  });

  // --- Priority ---
  it('death takes priority over kill', () => {
    const snap = makeSnapshot({
      isDead: true,
      events: [
        {
          EventID: 1,
          EventName: 'ChampionKill',
          EventTime: 300,
          KillerName: 'Player',
        },
      ],
    });
    const { result } = deriveContext(snap, makeState());
    expect(result?.category).toBe('mental');
  });

  it('kill takes priority over objective event', () => {
    const snap = makeSnapshot({
      events: [
        {
          EventID: 1,
          EventName: 'ChampionKill',
          EventTime: 300,
          KillerName: 'Player',
        },
        { EventID: 2, EventName: 'DragonKill', EventTime: 301 },
      ],
    });
    const { result } = deriveContext(snap, makeState());
    expect(result?.category).toBe('macro');
  });

  // --- State tracking ---
  it('updates lastEventId from new events', () => {
    const snap = makeSnapshot({
      events: [
        { EventID: 5, EventName: 'GameStart', EventTime: 0 },
        { EventID: 8, EventName: 'MinionsSpawning', EventTime: 65 },
      ],
    });
    const { newState } = deriveContext(snap, makeState({ lastEventId: 3 }));
    expect(newState.lastEventId).toBe(8);
  });

  it('tracks dragon kill time in state', () => {
    const snap = makeSnapshot({
      events: [{ EventID: 1, EventName: 'DragonKill', EventTime: 310 }],
    });
    const { newState } = deriveContext(snap, makeState());
    expect(newState.lastDragonKillTime).toBe(310);
  });

  it('tracks baron kill time in state', () => {
    const snap = makeSnapshot({
      events: [{ EventID: 1, EventName: 'BaronKill', EventTime: 1250 }],
    });
    const { newState } = deriveContext(snap, makeState());
    expect(newState.lastBaronKillTime).toBe(1250);
  });

  it('ignores already-seen events', () => {
    const snap = makeSnapshot({
      events: [
        {
          EventID: 1,
          EventName: 'ChampionKill',
          EventTime: 300,
          KillerName: 'Player',
        },
      ],
    });
    // lastEventId is already 1, so event 1 should be filtered out
    const state = makeState({ lastEventId: 1 });
    const { result } = deriveContext(snap, state);
    expect(result?.category).not.toBe('macro');
  });

  it('updates lastKnownLevel', () => {
    const snap = makeSnapshot({ level: 5 });
    const { newState } = deriveContext(snap, makeState({ lastKnownLevel: 4 }));
    expect(newState.lastKnownLevel).toBe(5);
  });
});
