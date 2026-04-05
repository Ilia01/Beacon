import { describe, it, expect, beforeEach } from 'vitest';
import {
  cycleOutputMode,
  resetOutputMode,
  type OutputMode,
} from './prompts.js';

describe('cycleOutputMode', () => {
  beforeEach(() => {
    resetOutputMode();
  });

  it('cycles from both to overlay to speech to both', () => {
    expect(cycleOutputMode()).toBe('overlay');
    expect(cycleOutputMode()).toBe('speech');
    expect(cycleOutputMode()).toBe('both');
  });

  it('wraps from both back to overlay', () => {
    cycleOutputMode();
    cycleOutputMode();
    cycleOutputMode();
    const mode = cycleOutputMode();
    expect(mode).toBe('overlay');
  });
});

describe('resetOutputMode', () => {
  it('resets outputMode to initial state from config', () => {
    cycleOutputMode();
    cycleOutputMode();
    resetOutputMode();
    expect(cycleOutputMode()).toBe('overlay');
  });
});
