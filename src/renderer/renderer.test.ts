import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(resolve(__dirname, 'renderer.js'), 'utf-8');

describe('renderer.js XSS invariants', () => {
  it('sets prompt text via innerText, not innerHTML', () => {
    expect(source).toContain('prompt.innerText');
    expect(source).not.toContain('prompt.innerHTML');
  });
});
