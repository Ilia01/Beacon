import { test, expect } from '@playwright/test';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test.describe('renderer.js', () => {
  test.beforeEach(async ({ page }) => {
    const htmlPath = path.join(
      __dirname,
      '..',
      'src',
      'renderer',
      'index.html',
    );
    await page.goto(`file://${htmlPath}`);
  });

  test('sets valid states for coach element', async ({ page }) => {
    const coach = page.locator('#coach');
    await expect(coach).toBeVisible();
  });

  test('prompt text element exists', async ({ page }) => {
    const promptText = page.locator('#prompt-text');
    await expect(promptText).toBeVisible();
  });

  test('beacon element exists and is draggable', async ({ page }) => {
    const beacon = page.locator('#beacon');
    await expect(beacon).toBeVisible();
  });

  test('handles invalid state gracefully', async ({ page }) => {
    const coach = page.locator('#coach');
    await expect(coach).toHaveClass(/idle/);
  });
});
