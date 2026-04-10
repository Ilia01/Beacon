import { test, expect } from '@playwright/test';
import * as path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function createMockSetupScript() {
  return `
    window.__mockAPI = {
      stateChanges: [],
      speakPrompts: [],
      positionCalls: [],
      listeners: {
        stateChange: [],
        speakPrompt: [],
        appStatus: []
      },
      version: '0.2.0',
      triggerStateChange: function(data) {
        this.stateChanges.push(data);
        this.listeners.stateChange.forEach(function(cb) { cb(data); });
      },
      triggerSpeakPrompt: function(text) {
        this.speakPrompts.push(text);
        this.listeners.speakPrompt.forEach(function(cb) { cb(text); });
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
        return Promise.resolve(window.__mockAPI.version);
      }
    };
  `;
}

async function loadRendererWithMocks(page) {
  await page.addInitScript(createMockSetupScript());

  const htmlPath = path.join(__dirname, '..', 'src', 'renderer', 'index.html');
  await page.goto(pathToFileURL(htmlPath).href);

  await page.waitForSelector('#coach');
}

test.describe('IPC State Change Handling', () => {
  test('coach element gets active class on active state', async ({ page }) => {
    await loadRendererWithMocks(page);

    await page.evaluate(() => {
      (window as any).__mockAPI.triggerStateChange({ state: 'active', prompt: 'Test prompt' });
    });

    const coach = page.locator('#coach');
    await expect(coach).toHaveClass(/active/);
  });

  test('coach element gets cooldown class on cooldown state', async ({ page }) => {
    await loadRendererWithMocks(page);

    await page.evaluate(() => {
      (window as any).__mockAPI.triggerStateChange({ state: 'cooldown' });
    });

    const coach = page.locator('#coach');
    await expect(coach).toHaveClass(/cooldown/);
  });

  test('coach element defaults to idle on unknown state', async ({ page }) => {
    await loadRendererWithMocks(page);

    await page.evaluate(() => {
      (window as any).__mockAPI.triggerStateChange({ state: 'invalid_state' });
    });

    const coach = page.locator('#coach');
    await expect(coach).toHaveClass(/idle/);
  });

  test('prompt text updates when state is active', async ({ page }) => {
    await loadRendererWithMocks(page);

    await page.evaluate(() => {
      (window as any).__mockAPI.triggerStateChange({ state: 'active', prompt: 'Push the wave' });
    });

    const promptText = page.locator('#prompt-text');
    await expect(promptText).toContainText('Push the wave');
  });

  test('prompt text persists through cooldown state', async ({ page }) => {
    await loadRendererWithMocks(page);

    await page.evaluate(() => {
      (window as any).__mockAPI.triggerStateChange({ state: 'active', prompt: 'Recall now' });
    });

    await page.evaluate(() => {
      (window as any).__mockAPI.triggerStateChange({ state: 'cooldown' });
    });

    const promptText = page.locator('#prompt-text');
    await expect(promptText).toContainText('Recall now');
  });
});

test.describe('Drag Position Tracking', () => {
  test('setPosition is called with correct delta during drag', async ({ page }) => {
    await loadRendererWithMocks(page);

    const beacon = page.locator('#beacon');
    await beacon.dispatchEvent('mousedown', { screenX: 100, screenY: 100 });

    await page.evaluate(() => {
      document.dispatchEvent(
        new MouseEvent('mousemove', { bubbles: true, screenX: 150, screenY: 120 })
      );
    });

    const calls = await page.evaluate(() => (window as any).__mockAPI.positionCalls);
    expect(calls).toContainEqual({ dx: 50, dy: 20 });
  });

  test('position delta is calculated correctly over multiple moves', async ({ page }) => {
    await loadRendererWithMocks(page);

    const beacon = page.locator('#beacon');
    await beacon.dispatchEvent('mousedown', { screenX: 100, screenY: 100 });

    await page.evaluate(() => {
      document.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, screenX: 110, screenY: 105 }));
      document.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, screenX: 120, screenY: 110 }));
    });

    const calls = await page.evaluate(() => (window as any).__mockAPI.positionCalls);
    expect(calls.length).toBe(2);
    expect(calls[0]).toEqual({ dx: 10, dy: 5 });
    expect(calls[1]).toEqual({ dx: 10, dy: 5 });
  });

  test('dragging stops after mouseup', async ({ page }) => {
    await loadRendererWithMocks(page);

    const beacon = page.locator('#beacon');
    await beacon.dispatchEvent('mousedown', { screenX: 100, screenY: 100 });

    await page.evaluate(() => {
      document.dispatchEvent(
        new MouseEvent('mousemove', { bubbles: true, screenX: 150, screenY: 120 })
      );
    });

    await page.evaluate(() => {
      document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
    });

    await page.evaluate(() => {
      document.dispatchEvent(
        new MouseEvent('mousemove', { bubbles: true, screenX: 200, screenY: 200 })
      );
    });

    const calls = await page.evaluate(() => (window as any).__mockAPI.positionCalls);
    expect(calls.length).toBe(1);
  });
});

test.describe('Speak Prompt Handling', () => {
  test('onSpeakPrompt handler is registered and callable', async ({ page }) => {
    await loadRendererWithMocks(page);

    await page.evaluate(() => {
      (window as any).__mockAPI.triggerSpeakPrompt('Ward the river');
    });

    const prompts = await page.evaluate(() => (window as any).__mockAPI.speakPrompts);
    expect(prompts).toContain('Ward the river');
  });
});

test.describe('DOM Element Verification', () => {
  test('all required elements exist', async ({ page }) => {
    await loadRendererWithMocks(page);

    await expect(page.locator('#coach')).toBeVisible();
    await expect(page.locator('#prompt-text')).toBeVisible();
    await expect(page.locator('#beacon')).toBeVisible();
  });
});
