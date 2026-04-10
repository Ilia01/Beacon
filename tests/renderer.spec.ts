import { test, expect } from '@playwright/test';
import * as path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function createMockSetupScript() {
  return `
    window.__mockAPI = {
      positionCalls: [],
      listeners: {
        stateChange: [],
        speakPrompt: [],
        appStatus: []
      }
    };

    window.electronAPI = {
      onStateChange: function(callback) {
        window.__mockAPI.listeners.stateChange.push(callback);
      },
      onSpeakPrompt: function(callback) {
        window.__mockAPI.listeners.speakPrompt.push(callback);
      },
      onAppStatus: function(callback) {
        window.__mockAPI.listeners.appStatus.push(callback);
      },
      setPosition: function(pos) {
        window.__mockAPI.positionCalls.push(pos);
      },
      getVersion: function() {
        return Promise.resolve('0.2.0');
      }
    };
  `;
}

test.describe('renderer.js', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(createMockSetupScript());
    const htmlPath = path.join(__dirname, '..', 'src', 'renderer', 'index.html');
    await page.goto(pathToFileURL(htmlPath).href);
  });

  test('coach element is visible', async ({ page }) => {
    const coach = page.locator('#coach');
    await expect(coach).toBeVisible();
  });

  test('prompt text element is visible', async ({ page }) => {
    const promptText = page.locator('#prompt-text');
    await expect(promptText).toBeVisible();
  });

  test('beacon element is visible and receives drag events', async ({ page }) => {
    const beacon = page.locator('#beacon');
    await expect(beacon).toBeVisible();

    await beacon.dispatchEvent('mousedown', { screenX: 100, screenY: 100 });
    await page.evaluate(() => {
      document.dispatchEvent(
        new MouseEvent('mousemove', { bubbles: true, screenX: 150, screenY: 120 })
      );
    });

    const calls = await page.evaluate(() => (window as any).__mockAPI.positionCalls);
    expect(calls.length).toBeGreaterThan(0);
  });

  test('coach element starts with idle class', async ({ page }) => {
    const coach = page.locator('#coach');
    await expect(coach).toHaveClass(/idle/);
  });
});
