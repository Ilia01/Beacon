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

  it('cycles through all three modes', () => {
    const results: OutputMode[] = [];
    for (let i = 0; i < 3; i++) {
      results.push(cycleOutputMode());
    }
    const uniqueResults = new Set(results);
    expect(uniqueResults.size).toBe(3);
  });

  it('wraps from both back to overlay', () => {
    cycleOutputMode();
    cycleOutputMode();
    cycleOutputMode();
    const mode = cycleOutputMode();
    expect(mode).toBe('overlay');
  });
});

describe('stopPromptLoop', () => {
  it('resets cycle to start from overlay (wraps from both)', () => {
    cycleOutputMode();
    cycleOutputMode();
    stopPromptLoop();
    const mode = cycleOutputMode();
    expect(mode).toBe('overlay');
  });
});
