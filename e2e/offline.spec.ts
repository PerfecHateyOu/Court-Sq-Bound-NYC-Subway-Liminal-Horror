import { test, expect } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { existsSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';

// The offline copy (scripts/build-offline.mjs): one index.html opened from disk, no network.
// The repo root is the folder above Playwright's config (e2e/).
const root = () => join(dirname(test.info().config.configFile!), '..');
const file = () => join(root(), 'dist-offline', 'Court-Sq-Bound', 'index.html');

test.describe('offline copy', () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeAll(() => {
    // CI builds it in its own step; build it here if it's missing (e.g. a local run).
    if (!existsSync(file())) execFileSync('node', [join(root(), 'scripts', 'build-offline.mjs')], { cwd: root(), stdio: 'inherit' });
  });

  test('is one self-contained file under 3 MB, zipped with its README', () => {
    expect(statSync(file()).size).toBeLessThan(3_000_000);
    expect(existsSync(join(root(), 'dist-offline', 'Court-Sq-Bound', 'README.txt'))).toBe(true);
    expect(existsSync(join(root(), 'dist-offline', 'Court-Sq-Bound-offline.zip'))).toBe(true);
  });

  test('opens from a double-click with no network, boards, rides and goes full screen', async ({ page, context }) => {
    const requests: string[] = [];
    await context.route('**/*', (route) => {
      const url = route.request().url();
      if (url.startsWith('file:') || url.startsWith('data:') || url.startsWith('blob:')) return route.continue();
      requests.push(url);
      return route.abort();
    });
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));

    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto('file://' + file());
    await expect(page.locator('text=/Board the train/i')).toBeVisible();
    // The embedded fonts are used (no fallback to the system font).
    expect(await page.evaluate(() => document.fonts.check('16px Archivo'))).toBe(true);

    await page.locator('text=/Board the train/i').click();
    await expect.poll(() => page.evaluate(() => !!document.fullscreenElement)).toBe(true);
    // The ride starts: the HUD shows the next stop and the 3D view draws.
    await expect(page.getByTestId('hud-route-panel')).toBeVisible({ timeout: 20_000 });
    await page.waitForTimeout(3000);
    const drawn = await page.evaluate(() => {
      const c = document.querySelector('canvas') as HTMLCanvasElement;
      return !!c && c.width > 0 && c.height > 0;
    });
    expect(drawn).toBe(true);

    expect(requests).toEqual([]);
    expect(errors).toEqual([]);
  });

  // The offline copy is a production build (no test hooks), so these drive it the way a player does.
  test('the core UI and controls work offline: Settings (saved), Case Files, camera, log, route, mute, pause, restart', async ({ page, context }) => {
    const { requests, errors } = await offline(page, context);
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto('file://' + file());

    // Settings are saved where a file:// page can keep them, and survive a reload.
    await page.getByRole('button', { name: 'Settings' }).click();
    await page.getByRole('checkbox', { name: /Full screen when boarding/ }).uncheck();
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: /Case Files/ }).first().click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await page.reload();
    await page.getByRole('button', { name: 'Settings' }).click();
    await expect(page.getByRole('checkbox', { name: /Full screen when boarding/ })).not.toBeChecked();
    await page.keyboard.press('Escape');

    await page.locator('text=/Board the train/i').click();
    await expect(page.getByTestId('hud-route-panel')).toBeVisible({ timeout: 20_000 });

    // Camera: raise, snap, lower.
    await page.keyboard.press('KeyC');
    await page.getByRole('button', { name: /SNAP PHOTO/ }).click();
    await page.waitForTimeout(800);
    await page.getByRole('button', { name: 'Lower Camera' }).click();
    await expect(page.getByRole('button', { name: /SNAP PHOTO/ })).toHaveCount(0);
    // Evidence log: Tab in, Tab out.
    await page.keyboard.press('Tab');
    await expect(page.getByRole('tablist', { name: 'Evidence' })).toBeVisible();
    await page.keyboard.press('Tab');
    await expect(page.getByRole('tablist', { name: 'Evidence' })).toHaveCount(0);
    // Route selector: switch to the L.
    await page.keyboard.press('KeyL');
    await page.getByRole('dialog', { name: 'MTA Transit Line Switching' }).getByRole('button', { name: /^L 14th/ }).click();
    await expect(page.getByTestId('hud-route-panel')).toHaveAccessibleName(/^L train/);
    // Mute.
    await page.keyboard.press('KeyM');
    await expect(page.getByRole('button', { name: 'Unmute' })).toBeVisible();
    await page.keyboard.press('KeyM');
    // Pause, Settings from the pause menu, resume; then restart from the pause menu.
    await page.keyboard.press('KeyP');
    await page.getByRole('button', { name: /Settings/ }).first().click();
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: 'Resume Ride' }).click();
    await expect(page.getByRole('button', { name: 'Resume Ride' })).toHaveCount(0);
    await page.keyboard.press('KeyP');
    await page.locator('text=/Restart Ride/i').click();
    await page.locator('[role=alertdialog]').locator('text=/^Restart$/').click();
    await expect(page.getByTestId('hud-route-panel')).toHaveAccessibleName(/^G train/); // a new ride is on the G

    expect(requests).toEqual([]);
    expect(errors).toEqual([]);
  });

  test.describe('on a phone', () => {
    test.use({ hasTouch: true, isMobile: true, viewport: { width: 844, height: 390 } });
    test('touch controls work offline: board, the HUD buttons, the log, pause and resume', async ({ page, context }) => {
      const { requests, errors } = await offline(page, context);
      await page.goto('file://' + file());
      await page.evaluate(() => localStorage.setItem('gtrain-settings', JSON.stringify({ fullscreenOnBoard: false })));
      await page.reload();
      await page.locator('text=/Board the train/i').tap();
      await expect(page.getByTestId('hud-route-panel')).toBeVisible({ timeout: 20_000 });
      await expect(page.getByText('WALK')).toBeVisible(); // the touch stick

      await page.getByRole('button', { name: 'Evidence Album' }).tap();
      await expect(page.getByRole('tablist', { name: 'Evidence' })).toBeVisible();
      await page.getByRole('button', { name: 'Close Album' }).tap();
      await expect(page.getByRole('tablist', { name: 'Evidence' })).toHaveCount(0);
      await page.getByRole('button', { name: 'Polaroid Camera' }).tap();
      await page.getByRole('button', { name: /SNAP PHOTO/ }).tap();
      await page.waitForTimeout(800);
      await page.getByRole('button', { name: 'Lower Camera' }).tap();
      await page.getByRole('button', { name: 'Pause', exact: true }).tap();
      await page.getByRole('button', { name: 'Resume Ride' }).tap();
      await expect(page.getByRole('button', { name: 'Resume Ride' })).toHaveCount(0);

      expect(requests).toEqual([]);
      expect(errors).toEqual([]);
    });
  });
});

/** Block everything but file:, data: and blob: URLs, and collect what was asked for and any errors. */
async function offline(page: import('@playwright/test').Page, context: import('@playwright/test').BrowserContext) {
  const requests: string[] = [];
  const errors: string[] = [];
  await context.route('**/*', (route) => {
    const url = route.request().url();
    if (url.startsWith('file:') || url.startsWith('data:') || url.startsWith('blob:')) return route.continue();
    requests.push(url);
    return route.abort();
  });
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  return { requests, errors };
}
