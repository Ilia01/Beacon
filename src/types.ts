import prompts from '../data/prompts.json' with { type: 'json' };

export type PromptCategory = keyof typeof prompts;

export type Position = {
  x: number;
  y: number;
};

export type StateChangeEvent =
  | { state: 'active'; prompt: string }
  | { state: 'cooldown' }
  | { state: 'idle' };

export type ServerMessage =
  | { type: 'DATA'; payload: import('./riot.types.js').GameSnapshot }
  | { type: 'FETCH_ERROR'; reason: string };

export type GameSummaryEntry = {
  category: string;
  count: number;
  timestamps: string[];
};

export type GameSummary = {
  totalPrompts: number;
  entries: GameSummaryEntry[];
};
