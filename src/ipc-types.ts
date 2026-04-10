export type StateChangeEvent =
  | { state: 'active'; prompt: string }
  | { state: 'cooldown' }
  | { state: 'idle' };

export type AppStatus = { status: 'waiting' } | { status: 'connected' };
