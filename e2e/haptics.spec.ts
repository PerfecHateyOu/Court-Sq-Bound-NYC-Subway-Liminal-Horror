import { devices } from '@playwright/test';
import { test, expect, board } from './game';

// Records vibrate() calls with the game time they happened at.
const STUB = `(() => { window.__vib = []; navigator.vibrate = function (p) {
  window.__vib.push({ p: JSON.stringify(p), gt: window.__G ? window.__G.GT : null }); return true; }; })();`;
const TOGGLE = 'label:has-text("Vibrate for catches") input';
// The toggle lives in Settings.
const openSettings = (page: import('@playwright/test').Page) => page.getByRole('button', { name: 'Settings' }).click();

test.describe('haptics on desktop', () => {
  test('no vibration toggle', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('text=/Board the train/i')).toBeVisible();
    await page.getByRole('button', { name: 'Settings' }).click();
    await expect(page.locator('[role=dialog]')).toBeVisible();
    await expect(page.locator('text=/Vibrate for catches/i')).toHaveCount(0);
  });
});

test.describe('haptics on a phone', () => {
  const { defaultBrowserType: _ignored, ...pixel } = devices['Pixel 7'];
  test.use(pixel);
  // These reload and ride several times on an emulated phone; give them extra time under load.
  test.slow();
  test.beforeEach(async ({ page }) => page.addInitScript(STUB));

  test('pulses at arrival only, one per catch (max 3), never when flagging', async ({ page }) => {
    await page.goto('/');
    await openSettings(page);
    await expect(page.locator(TOGGLE)).toBeChecked();
    const game = await board(page);
    const two = await game(`G.Q = []; G.startSegment(6); advance(0.3);
      G.active.forEach((a) => { a.apply(); a.at = G.GT; }); const ids = G.active.map((a) => a.tids[0]);
      window.__vib = []; ids.forEach(flag); flag('mom'); const during = window.__vib.length;
      const at = G.GT; G.arrive(); const right = window.__vib.length; advance(1.6);
      return { n: ids.length, during, right, calls: window.__vib, delay: window.__vib[0] ? window.__vib[0].gt - at : null, acc: G.acc };`);
    expect(two.n).toBe(2);
    expect(two.during).toBe(0);
    expect(two.right).toBe(0);
    expect(two.calls.map((c: any) => c.p)).toEqual(['[22,160,22]']);
    expect(two.delay).toBeGreaterThanOrEqual(0.85);
    expect(two.delay).toBeLessThanOrEqual(1.1);
    expect(two.acc).toMatchObject({ correct: 2, fp: 1 });

    const none = await game(`G.Q = []; G.startSegment(7); advance(0.3); G.active.forEach((a) => { a.apply(); a.at = G.GT; });
      window.__vib = []; flag('mom'); flag('dad'); G.arrive(); advance(1.6); return window.__vib;`);
    expect(none).toEqual([]);

    const three = await game(`G.Q = []; G.startSegment(11); advance(0.3); G.active.forEach((a) => { a.apply(); a.at = G.GT; });
      window.__vib = []; G.active.forEach((a) => flag(a.tids[0])); const n = G.active.length; G.arrive(); advance(1.6);
      return { n, calls: window.__vib.map((c) => c.p) };`);
    expect(three.calls).toEqual([JSON.stringify([22, 160, 22, 160, 22].slice(0, Math.max(1, three.n * 2 - 1)))]);

    await game(`window.__vib = []; key('KeyP'); await sleep(300);`);
    expect(await game(`return window.__vib.map((c) => c.p)`)).toContain('0');
  });

  test('turning it off is remembered and silences it', async ({ page }) => {
    await page.goto('/');
    await openSettings(page);
    await page.locator(TOGGLE).click();
    await page.reload();
    await openSettings(page);
    await expect(page.locator(TOGGLE)).not.toBeChecked();
    await page.keyboard.press('Escape');
    const game = await board(page, { keepStorage: true });
    const calls = await game(`G.Q = []; G.startSegment(6); advance(0.3); G.active.forEach((a) => { a.apply(); a.at = G.GT; });
      window.__vib = []; G.active.forEach((a) => flag(a.tids[0])); G.arrive(); advance(1.6); return window.__vib.filter((c) => c.p !== '0');`);
    expect(calls).toEqual([]);
  });
});
