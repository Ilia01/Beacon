import { describe, it, expect } from 'vitest';
import { buildGameSummary } from './prompts.js';
import type { PromptCategory } from '../types.js';

type PromptHistoryEntry = {
  text: string;
  category: PromptCategory;
  time: number;
  gameTimeSec: number;
};

function entry(
  category: PromptCategory,
  gameTimeSec: number,
  text = 'prompt',
): PromptHistoryEntry {
  return { text, category, time: Date.now(), gameTimeSec };
}

describe('buildGameSummary', () => {
  it('returns empty summary for empty history', () => {
    const summary = buildGameSummary([]);
    expect(summary.totalPrompts).toBe(0);
    expect(summary.entries).toEqual([]);
  });

  it('counts prompts per category', () => {
    // History is in chronological order (oldest-first)
    const history = [
      entry('macro', 100),
      entry('macro', 200),
      entry('vision', 300),
      entry('macro', 400),
      entry('vision', 600),
    ];
    const summary = buildGameSummary(history);
    expect(summary.totalPrompts).toBe(5);
    expect(summary.entries).toHaveLength(2);

    const macroEntry = summary.entries.find((e) => e.category === 'macro');
    const visionEntry = summary.entries.find((e) => e.category === 'vision');
    expect(macroEntry?.count).toBe(3);
    expect(visionEntry?.count).toBe(2);
  });

  it('sorts entries by count descending', () => {
    const history = [
      entry('trading', 100),
      entry('macro', 200),
      entry('macro', 300),
      entry('macro', 400),
      entry('vision', 500),
      entry('vision', 600),
    ];
    const summary = buildGameSummary(history);
    expect(summary.entries[0]?.category).toBe('macro');
    expect(summary.entries[0]?.count).toBe(3);
    expect(summary.entries[1]?.category).toBe('vision');
    expect(summary.entries[1]?.count).toBe(2);
    expect(summary.entries[2]?.category).toBe('trading');
    expect(summary.entries[2]?.count).toBe(1);
  });

  it('formats timestamps as mm:ss', () => {
    const history = [entry('macro', 125)]; // 2:05
    const summary = buildGameSummary(history);
    expect(summary.entries[0]?.timestamps).toEqual(['2:05']);
  });

  it('lists timestamps in chronological order', () => {
    // History is in chronological order (oldest-first)
    const history = [
      entry('macro', 60),
      entry('macro', 300),
      entry('macro', 600),
    ];
    const summary = buildGameSummary(history);
    expect(summary.entries[0]?.timestamps).toEqual(['1:00', '5:00', '10:00']);
  });

  it('handles single prompt', () => {
    const history = [entry('mental', 0, 'Take a breath')];
    const summary = buildGameSummary(history);
    expect(summary.totalPrompts).toBe(1);
    expect(summary.entries).toHaveLength(1);
    expect(summary.entries[0]?.category).toBe('mental');
    expect(summary.entries[0]?.count).toBe(1);
    expect(summary.entries[0]?.timestamps).toEqual(['0:00']);
  });
});
