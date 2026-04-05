import type { GameSnapshot } from '../riot.types.js';

export function isValidSnapshot(data: unknown): data is GameSnapshot {
  if (typeof data !== 'object' || data === null) return false;
  const d = data as Record<string, unknown>;
  return (
    typeof d.activePlayer === 'object' &&
    d.activePlayer !== null &&
    Array.isArray(d.allPlayers) &&
    typeof d.events === 'object' &&
    d.events !== null &&
    typeof d.gameData === 'object' &&
    d.gameData !== null &&
    typeof (d.gameData as Record<string, unknown>).gameTime === 'number'
  );
}
