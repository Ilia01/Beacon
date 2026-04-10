import type { GameSnapshot } from '../riot.types.js';

export function isValidSnapshot(data: unknown): data is GameSnapshot {
  if (typeof data !== 'object' || data === null) return false;
  const d = data as Record<string, unknown>;

  const activePlayer = d.activePlayer as Record<string, unknown> | undefined;
  const events = d.events as Record<string, unknown> | undefined;
  const gameData = d.gameData as Record<string, unknown> | undefined;
  const championStats = activePlayer?.championStats as Record<string, unknown> | undefined;

  return (
    typeof activePlayer === 'object' &&
    activePlayer !== null &&
    typeof activePlayer.riotId === 'string' &&
    typeof activePlayer.riotIdGameName === 'string' &&
    typeof activePlayer.level === 'number' &&
    typeof activePlayer.currentGold === 'number' &&
    typeof championStats === 'object' &&
    championStats !== null &&
    typeof championStats.maxHealth === 'number' &&
    typeof championStats.currentHealth === 'number' &&
    Array.isArray(d.allPlayers) &&
    typeof events === 'object' &&
    events !== null &&
    Array.isArray(events.Events) &&
    typeof gameData === 'object' &&
    gameData !== null &&
    typeof gameData.gameTime === 'number'
  );
}
