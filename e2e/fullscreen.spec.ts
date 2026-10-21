import { test, expect } from '@playwright/test';
import { watchErrors } from './game';

const FS = () => !!document.fullscreenElement;
const fresh = async (page: import('@playwright/test').Page, settings?: object) => {
  await page.goto('/');
  await page.evaluate((s) => {
    localStorage.clear();
    localStorage.setItem('gtrain-tutorial', 'done'); // e2e/tutorial.spec.ts covers the first-ride practice
    if (s) localStorage.setItem('gtrain-settings', JSON.stringify(s));
  }, settings ?? null);
  await page.reload();
};
const boardTrain = async (page: import('@playwright/test').Page) => {
  await page.locator('text=/Board the train/i').click();
  await page.waitForFunction(() => (window as any).__G?.phase !== 'menu');
};

test.describe('full screen', () => {
  test('boarding goes full screen by default, and leaving it mid-ride pauses', async ({ page }) => {
    const errs = watchErrors(page);
    await page.setViewportSize({ width: 1280, height: 720 });
    await fresh(page);
    await boardTrain(page);
    await expect.poll(() => page.evaluate(FS)).toBe(true);

    await page.evaluate(() => {
      (window as any).__G.phase = 'ride';
      return document.exitFullscreen();
    });
    await expect.poll(() => page.evaluate(FS)).toBe(false);
    await expect.poll(() => page.evaluate(() => (window as any).__G.paused)).toBe(true);
    expect(errs).toEqual([]);
  });

  test('with the setting off, boarding stays windowed', async ({ page }) => {
    await fresh(page, { fullscreenOnBoard: false });
    await boardTrain(page);
    await page.waitForTimeout(500);
    expect(await page.evaluate(FS)).toBe(false);
  });

  test('the pause menu and the HUD button switch full screen on and off', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await fresh(page, { fullscreenOnBoard: false });
    await boardTrain(page);

    const hud = page.getByRole('button', { name: 'Full screen', exact: true });
    await expect(hud).toBeVisible();
    await hud.click();
    await expect.poll(() => page.evaluate(FS)).toBe(true);
    await expect(page.getByRole('button', { name: 'Exit full screen', exact: true })).toBeVisible();

    await page.evaluate(() => (window as any).__G.pause());
    await page.getByRole('button', { name: 'Exit Full Screen', exact: true }).click();
    await expect.poll(() => page.evaluate(FS)).toBe(false);
    await page.getByRole('button', { name: 'Full Screen', exact: true }).click();
    await expect.poll(() => page.evaluate(FS)).toBe(true);
  });

  test('the buttons follow the browser: leaving another way shows Full screen again, and pauses', async ({ page }) => {
    const errs = watchErrors(page);
    await page.setViewportSize({ width: 1280, height: 720 });
    await fresh(page, { fullscreenOnBoard: false });
    await boardTrain(page);
    await page.evaluate(() => { const G = (window as any).__G; G.Q = []; G.startSegment(2); });
    await page.getByRole('button', { name: 'Full screen', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Exit full screen', exact: true })).toBeVisible();

    // Esc, a swipe or the browser's own control: not the game's button.
    await page.evaluate(() => document.exitFullscreen());
    await expect(page.getByRole('button', { name: 'Full screen', exact: true })).toBeAttached();
    await expect.poll(() => page.evaluate(() => (window as any).__G.paused)).toBe(true);
    await expect(page.getByRole('button', { name: 'Full Screen', exact: true })).toBeVisible(); // pause menu
    expect(errs).toEqual([]);
  });

  test('the HUD’s Exit full screen leaves without pausing the ride', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await fresh(page, { fullscreenOnBoard: false });
    await boardTrain(page);
    await page.evaluate(() => { const G = (window as any).__G; G.Q = []; G.startSegment(2); });
    await page.getByRole('button', { name: 'Full screen', exact: true }).click();
    await expect.poll(() => page.evaluate(FS)).toBe(true);
    await page.getByRole('button', { name: 'Exit full screen', exact: true }).click();
    await expect.poll(() => page.evaluate(FS)).toBe(false);
    await expect(page.getByRole('button', { name: 'Full screen', exact: true })).toBeVisible();
    await page.waitForTimeout(300);
    expect(await page.evaluate(() => (window as any).__G.paused)).toBe(false);

    // Leaving another way afterwards still pauses (the button's request was used up).
    await page.getByRole('button', { name: 'Full screen', exact: true }).click();
    await expect.poll(() => page.evaluate(FS)).toBe(true);
    await page.evaluate(() => document.exitFullscreen());
    await expect.poll(() => page.evaluate(() => (window as any).__G.paused)).toBe(true);
  });

  test('when the browser refuses, the button stays as it was, with no pause and no error', async ({ page }) => {
    const errs = watchErrors(page);
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.addInitScript(() => {
      Element.prototype.requestFullscreen = () => Promise.reject(new TypeError('Permissions check failed'));
    });
    await fresh(page, { fullscreenOnBoard: false });
    await boardTrain(page);
    await page.evaluate(() => { const G = (window as any).__G; G.Q = []; G.startSegment(2); });
    await page.getByRole('button', { name: 'Full screen', exact: true }).click();
    await page.waitForTimeout(300);
    expect(await page.evaluate(FS)).toBe(false);
    await expect(page.getByRole('button', { name: 'Full screen', exact: true })).toBeVisible();
    expect(await page.evaluate(() => (window as any).__G.paused)).toBe(false);
    expect(errs).toEqual([]);
  });

  test('the HUD button is left off narrow screens (the pause menu has it)', async ({ page }) => {
    await page.setViewportSize({ width: 844, height: 390 });
    await fresh(page, { fullscreenOnBoard: false });
    await boardTrain(page);
    await expect(page.getByRole('button', { name: 'Full screen', exact: true })).toBeHidden();
  });

  test('the setting is in Settings and is saved', async ({ page }) => {
    await fresh(page);
    await page.getByRole('button', { name: 'Settings' }).click();
    const box = page.getByRole('checkbox', { name: /Full screen when boarding/ });
    await expect(box).toBeChecked();
    await box.uncheck();
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('gtrain-settings')!).fullscreenOnBoard)).toBe(false);
  });

  test('the home-screen app opens full screen: manifest and icons are served', async ({ page, request }) => {
    await page.goto('/');
    const href = await page.locator('link[rel="manifest"]').getAttribute('href');
    const m = await (await request.get(href!)).json();
    expect(m.display).toBe('fullscreen');
    for (const i of m.icons) expect((await request.get(i.src)).status()).toBe(200);
    expect((await request.get('/icons/apple-touch-icon.png')).status()).toBe(200);
    await expect(page.locator('meta[name="apple-mobile-web-app-capable"]')).toHaveAttribute('content', 'yes');
  });
});

test.describe('full screen on a phone without the Fullscreen API (iPhone)', () => {
  test.use({ hasTouch: true, isMobile: true, viewport: { width: 844, height: 390 } });
  test('the pause menu explains Add to Home Screen instead of showing a button that can’t work', async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(Document.prototype, 'fullscreenEnabled', { get: () => false });
      Object.defineProperty(Document.prototype, 'webkitFullscreenEnabled', { get: () => false });
    });
    await fresh(page);
    await boardTrain(page);
    expect(await page.evaluate(FS)).toBe(false);
    await page.evaluate(() => (window as any).__G.pause());
    await expect(page.getByTestId('home-screen-tip')).toContainText('Add to Home Screen');
    await expect(page.getByRole('button', { name: /Full Screen/ })).toHaveCount(0);
  });
});

test.describe('the home-screen app on Android (it opens full screen already)', () => {
  test.use({ hasTouch: true, isMobile: true, viewport: { width: 844, height: 390 } });
  test('offers no full-screen button or setting, asks for nothing on boarding, and shows no tip', async ({ page }) => {
    const errs = watchErrors(page);
    await page.addInitScript(() => {
      // display: fullscreen from the manifest; the Fullscreen API is still reported as available.
      const real = window.matchMedia.bind(window);
      window.matchMedia = (q: string) =>
        /display-mode:\s*fullscreen/.test(q) ? ({ matches: true, media: q, addEventListener() {}, removeEventListener() {} } as unknown as MediaQueryList) : real(q);
      (window as any).__fsRequests = 0;
      Element.prototype.requestFullscreen = function () {
        (window as any).__fsRequests++;
        return Promise.resolve();
      };
    });
    await fresh(page); // full screen on boarding is on by default
    await page.getByRole('button', { name: 'Settings' }).click();
    await expect(page.getByRole('checkbox', { name: /Full screen when boarding/ })).toHaveCount(0);
    await page.keyboard.press('Escape');

    await boardTrain(page);
    expect(await page.evaluate(() => (window as any).__fsRequests)).toBe(0);
    await page.evaluate(() => (window as any).__G.pause());
    await expect(page.getByRole('button', { name: 'Resume Ride' })).toBeVisible();
    await expect(page.getByRole('button', { name: /Full Screen/i })).toHaveCount(0);
    await expect(page.getByTestId('home-screen-tip')).toHaveCount(0);
    expect(errs).toEqual([]);
  });
});
