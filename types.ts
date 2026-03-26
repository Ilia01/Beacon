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

export type StateChangeEvent = StateChangeActive | StateChangeCooldown | StateChangeIdle;
