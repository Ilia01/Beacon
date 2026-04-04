export type Ability = {
  abilityLevel: number;
  displayName: string;
  id: string;
  rawDescription: string;
  rawDisplayName: string;
};

export type Abilities = {
  Passive: Omit<Ability, 'abilityLevel'>;
  Q: Ability;
  W: Ability;
  E: Ability;
  R: Ability;
};

export type ChampionStats = {
  abilityHaste: number;
  abilityPower: number;
  armor: number;
  armorPenetrationFlat: number;
  armorPenetrationPercent: number;
  attackDamage: number;
  attackRange: number;
  attackSpeed: number;
  bonusArmorPenetrationPercent: number;
  bonusMagicPenetrationPercent: number;
  critChance: number;
  critDamage: number;
  currentHealth: number;
  healShieldPower: number;
  healthRegenRate: number;
  lifeSteal: number;
  magicLethality: number;
  magicPenetrationFlat: number;
  magicPenetrationPercent: number;
  magicResist: number;
  maxHealth: number;
  moveSpeed: number;
  omnivamp: number;
  physicalLethality: number;
  physicalVamp: number;
  resourceMax: number;
  resourceRegenRate: number;
  resourceType: string;
  resourceValue: number;
  spellVamp: number;
  tenacity: number;
};

export type Rune = {
  displayName: string;
  id: number;
  rawDescription: string;
  rawDisplayName: string;
};

export type FullRunes = {
  generalRunes: Rune[];
  keystone: Rune;
  primaryRuneTree: Rune;
  secondaryRuneTree: Rune;
  statRunes: { id: number; rawDescription: string }[];
};

export type ActivePlayer = {
  abilities: Abilities;
  championStats: ChampionStats;
  currentGold: number;
  fullRunes: FullRunes;
  level: number;
  riotId: string;
  riotIdGameName: string;
  riotIdTagLine: string;
  summonerName: string;
};

export type Item = {
  canUse: boolean;
  consumable: boolean;
  count: number;
  displayName: string;
  itemID: number;
  price: number;
  rawDescription: string;
  rawDisplayName: string;
  slot: number;
};

export type SummonerSpell = {
  displayName: string;
  rawDescription: string;
  rawDisplayName: string;
};

export type PlayerRunes = {
  keystone: Rune;
  primaryRuneTree: Rune;
  secondaryRuneTree: Rune;
};

export type PlayerScores = {
  assists: number;
  creepScore: number;
  deaths: number;
  kills: number;
  wardScore: number;
};

export type Player = {
  championName: string;
  isBot: boolean;
  isDead: boolean;
  items: Item[];
  level: number;
  position: 'TOP' | 'JUNGLE' | 'MIDDLE' | 'BOTTOM' | 'UTILITY';
  respawnTimer: number;
  riotId: string;
  riotIdGameName: string;
  riotIdTagLine: string;
  runes: PlayerRunes;
  scores: PlayerScores;
  summonerSpells: {
    summonerSpellOne: SummonerSpell;
    summonerSpellTwo: SummonerSpell;
  };
  team: 'ORDER' | 'CHAOS';
};

export type GameEvent = {
  EventID: number;
  EventName: string;
  EventTime: number;
  Assisters?: string[];
  KillerName?: string;
  VictimName?: string;
};

export type GameData = {
  gameMode: string;
  gameTime: number;
  mapName: string;
  mapNumber: number;
  mapTerrain: string;
};

export type GameSnapshot = {
  activePlayer: ActivePlayer;
  allPlayers: Player[];
  events: { Events: GameEvent[] };
  gameData: GameData;
};
