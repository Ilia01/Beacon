export type StateChangeActive = {
  state: 'active';
  prompt: string;
};

export type StateChangeCooldown = {
  state: 'cooldown';
};

export type StateChangeIdle = {
  state: 'idle';
};

export type position = {
  x: number;
  y: number;
};

export type StateChangeEvent =
  | StateChangeActive
  | StateChangeCooldown
  | StateChangeIdle;
