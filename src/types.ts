import prompts from '../data/prompts.json' with { type: 'json' };

export type PromptCategory = keyof typeof prompts;

export type Position = {
  x: number;
  y: number;
};

export type { StateChangeEvent, AppStatus } from './ipc-types.js';

export type ServerMessage =
  | { type: 'DATA'; payload: import('./riot.types.js').GameSnapshot }
  | { type: 'FETCH_ERROR'; reason: string };
