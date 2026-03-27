export type ActivePlayer = {
  currentGold: number;
  level: number;
  riotId: string;
  riotIdGameName: string;
};

export type PlayerScores = {
  creepScore: number;
};

export type Player = {
  riotId: string;
  position: 'TOP' | 'JUNGLE' | 'MIDDLE' | 'BOTTOM' | 'UTILITY';
  team: 'ORDER' | 'CHAOS';
  isDead: boolean;
  scores: PlayerScores;
};

export type GameEvent = {
  EventID: number;
  EventName: string;
  EventTime: number;
  KillerName?: string;
};

export type GameData = {
  gameTime: number;
};

export type GameSnapshot = {
  activePlayer: ActivePlayer;
  allPlayers: Player[];
  events: { Events: GameEvent[] };
  gameData: GameData;
};
