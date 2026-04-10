import { describe, it, expect } from 'vitest';
import { canResolve, resolveTemplate } from './templates.js';

describe('canResolve', () => {
  it('returns true when all placeholders have matching data keys', () => {
    expect(canResolve('{enemy} bought {item}', { enemy: 'Zed', item: 'Duskblade' })).toBe(true);
  });

  it('returns false when a placeholder key is missing from data', () => {
    expect(canResolve('{enemy} bought {item}', { enemy: 'Zed' })).toBe(false);
  });

  it('returns true for template with no placeholders', () => {
    expect(canResolve('Check the map!', {})).toBe(true);
  });

  it('returns true for empty template', () => {
    expect(canResolve('', {})).toBe(true);
  });

  it('returns true when data has extra keys beyond what template needs', () => {
    expect(canResolve('{enemy}', { enemy: 'Zed', item: 'Blade' })).toBe(true);
  });

  it('returns false when one of many placeholders is missing', () => {
    expect(canResolve('{a} {b} {c}', { a: '1', c: '3' })).toBe(false);
  });
});

describe('resolveTemplate', () => {
  it('replaces all placeholders with matching data values', () => {
    const result = resolveTemplate('Enemy {enemy} has {item}', { enemy: 'Zed', item: 'Duskblade' });
    expect(result).toBe('Enemy Zed has Duskblade');
  });

  it('leaves unknown placeholders as-is', () => {
    const result = resolveTemplate('{enemy} bought {item}', { enemy: 'Zed' });
    expect(result).toBe('Zed bought {item}');
  });

  it('returns template unchanged when data is empty', () => {
    const result = resolveTemplate('Hello {name}', {});
    expect(result).toBe('Hello {name}');
  });

  it('returns template unchanged when there are no placeholders', () => {
    const result = resolveTemplate('Check the map!', { enemy: 'Zed' });
    expect(result).toBe('Check the map!');
  });

  it('handles empty template', () => {
    expect(resolveTemplate('', { a: '1' })).toBe('');
  });

  it('handles multiple occurrences of the same placeholder', () => {
    const result = resolveTemplate('{name} vs {name}', { name: 'Zed' });
    expect(result).toBe('Zed vs Zed');
  });
});
