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
