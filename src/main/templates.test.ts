import { describe, it, expect } from 'vitest';
import { canResolve, resolveTemplate } from './templates.js';

describe('canResolve', () => {
  it('returns true when all placeholders have corresponding data', () => {
    const template = 'Enemy {enemy} has {item}';
    const data = { enemy: 'Zed', item: 'Duskblade' };
    expect(canResolve(template, data)).toBe(true);
  });

  it('returns true when template has no placeholders', () => {
    const template = 'Just a simple message';
    expect(canResolve(template, {})).toBe(true);
  });

  it('returns false when a placeholder is missing from data', () => {
    const template = 'Enemy {enemy} has {item}';
    const data = { enemy: 'Zed' };
    expect(canResolve(template, data)).toBe(false);
  });

  it('returns false when multiple placeholders are missing', () => {
    const template = '{a} and {b} and {c}';
    const data = { a: '1' };
    expect(canResolve(template, data)).toBe(false);
  });

  it('returns true when data has extra keys', () => {
    const template = 'Hello {name}';
    const data = { name: 'Alice', extra: 'ignored' };
    expect(canResolve(template, data)).toBe(true);
  });

  it('handles duplicate placeholders', () => {
    const template = '{name} said: {name}';
    const data = { name: 'Bob' };
    expect(canResolve(template, data)).toBe(true);
  });
});

describe('resolveTemplate', () => {
  it('replaces single placeholder', () => {
    const template = 'Hello {name}';
    const data = { name: 'Alice' };
    expect(resolveTemplate(template, data)).toBe('Hello Alice');
  });

  it('replaces multiple placeholders', () => {
    const template = 'Enemy {enemy} has {item}';
    const data = { enemy: 'Zed', item: 'Duskblade' };
    expect(resolveTemplate(template, data)).toBe('Enemy Zed has Duskblade');
  });

  it('leaves unknown placeholders unchanged', () => {
    const template = 'Hello {name}, your score is {score}';
    const data = { name: 'Bob' };
    expect(resolveTemplate(template, data)).toBe(
      'Hello Bob, your score is {score}',
    );
  });

  it('returns template unchanged when data is empty', () => {
    const template = 'Hello {name}';
    expect(resolveTemplate(template, {})).toBe('Hello {name}');
  });

  it('handles template with no placeholders', () => {
    const template = 'Just a message';
    expect(resolveTemplate(template, { any: 'thing' })).toBe('Just a message');
  });

  it('handles duplicate placeholders', () => {
    const template = '{name} said hello to {name}';
    const data = { name: 'Charlie' };
    expect(resolveTemplate(template, data)).toBe(
      'Charlie said hello to Charlie',
    );
  });

  it('replaces consecutive placeholders', () => {
    const template = '{a}{b}{c}';
    const data = { a: '1', b: '2', c: '3' };
    expect(resolveTemplate(template, data)).toBe('123');
  });

  it('handles numeric values in data', () => {
    const template = 'Level {level}, CS {cs}';
    const data = { level: '6', cs: '45' };
    expect(resolveTemplate(template, data)).toBe('Level 6, CS 45');
  });
});
