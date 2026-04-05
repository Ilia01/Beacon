import { describe, it, expect, beforeEach } from 'vitest';
import {
  cycleOutputMode,
  stopPromptLoop,
  type OutputMode,
} from './prompts.js';

describe('cycleOutputMode', () => {
  beforeEach(() => {
    stopPromptLoop();
  });

  it('cycles through all modes eventually', () => {
    const results: OutputMode[] = [];
    for (let i = 0; i < 6; i++) {
      results.push(cycleOutputMode());
    }
    expect(results.length).toBe(6);
  });

  it('cycles to the next mode in sequence', () => {
    const first = cycleOutputMode();
    const second = cycleOutputMode();
    const third = cycleOutputMode();

    const uniqueResults = new Set([first, second, third]);
    expect(uniqueResults.size).toBe(3);
  });
});

describe('stopPromptLoop', () => {
  it('resets the prompt loop state', () => {
    stopPromptLoop();
  });
});
