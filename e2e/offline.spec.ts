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
});
