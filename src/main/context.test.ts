import { describe, it, expect } from 'vitest';
import {
  deriveContext,
  initialContextState,
  type ContextState,
} from './context.js';
import type { GameSnapshot, Player } from '../riot.types.js';

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
  } = {},
): GameSnapshot {
  const gameTime = overrides.gameTime ?? 300;
  return {
    activePlayer: {
      currentGold: overrides.gold ?? 500,
      level: overrides.level ?? 1,
      riotId: 'Player#123',
      riotIdGameName: 'Player',
    },
    allPlayers: [
      {
        riotId: 'Player#123',
        position: 'MIDDLE',
        team: 'ORDER',
        isDead: overrides.isDead ?? false,
        scores: { creepScore: overrides.creepScore ?? 45 },
      },
      {
        riotId: 'Enemy#456',
        position: 'MIDDLE',
        team: 'CHAOS',
        isDead: false,
        scores: { creepScore: overrides.enemyCreepScore ?? 45 },
      },
    ],
    events: { Events: overrides.events ?? [] },
    gameData: { gameTime },
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
