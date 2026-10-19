import { test, expect } from './game';
import type { Locator, Page } from '@playwright/test';

// Phone layouts: the HUD's top bar never overlaps, overlays that don't fit scroll (top and bottom
// both reachable), and content stays out of notches and the home indicator.

/** Scrolled into view, the whole element is on screen. */
async function expectReachable(page: Page, el: Locator) {
  await el.scrollIntoViewIfNeeded();
  const b = (await el.boundingBox())!;
  const vp = page.viewportSize()!;
  expect(b.y, 'top on screen').toBeGreaterThanOrEqual(0);
  expect(b.x, 'left on screen').toBeGreaterThanOrEqual(0);
  expect(b.y + b.height, 'bottom on screen').toBeLessThanOrEqual(vp.height + 0.5);
  expect(b.x + b.width, 'right on screen').toBeLessThanOrEqual(vp.width + 0.5);
}

const overlap = (a: { x: number; y: number; width: number; height: number }, b: typeof a) =>
  a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;

const SIZES = [
  [320, 568],
  [360, 640],
  [390, 844],
  [640, 360],
  [844, 390],
  [1024, 768],
] as const;

for (const [width, height] of SIZES) {
  test.describe(`${width}×${height}`, () => {
    test.use({ viewport: { width, height }, hasTouch: true, isMobile: true });

    test('the HUD top bar fits: route panel and controls never overlap, the station name shows in full', async ({ page, game }) => {
      // Myrtle–Willoughby Avs, with the recorder button showing too: the widest the bar gets.
      await game(`window.__EVP.hasRecorder = true; G.Q = []; G.startSegment(4); G.notifyUI();`);
      const panel = page.getByTestId('hud-route-panel');
      await expect(panel).toContainText('Myrtle–Willoughby Avs');
      const controls = page.getByRole('button', { name: 'Polaroid Camera' }).locator('..');
      const [p, c] = [(await panel.boundingBox())!, (await controls.boundingBox())!];
      expect(overlap(p, c)).toBe(false);
      for (const name of ['Polaroid Camera', 'Recorder', 'Evidence Log', 'Route Lines', 'Mute', 'Pause']) {
        await expectReachable(page, page.getByRole('button', { name, exact: true }));
      }
      const fits = await panel.locator('b').evaluate((b) => b.scrollWidth <= b.clientWidth);
      expect(fits, 'station name not truncated').toBe(true);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    });

    test('the pause menu and route selector fit or scroll, top and bottom', async ({ page, game }) => {
      await game(`G.nightmare = true; G.Q = []; G.startSegment(2); G.pause();`); // Nightmare adds a line
      await page.locator('text=/Restart Ride/i').click();
      const dialog = page.locator('[role=alertdialog]');
      await expectReachable(page, dialog.getByRole('button', { name: 'Cancel' }));
      await expectReachable(page, page.getByText('Train Paused'));
      await dialog.getByRole('button', { name: 'Cancel' }).click();
      await page.getByRole('button', { name: 'Resume Ride' }).click();

      await page.getByRole('button', { name: 'Route Lines' }).click();
      const selector = page.getByRole('dialog', { name: 'MTA Transit Line Switching' });
      const close = selector.getByRole('button', { name: 'Close route selector' });
      await expectReachable(page, close);
      expect((await close.boundingBox())!.width).toBeGreaterThanOrEqual(36); // not squashed
      for (const line of [/^G /, /^L /, /^7 /]) await expectReachable(page, selector.getByRole('button', { name: line }));
      await expectReachable(page, close); // the header stays put while the list scrolls
    });
  });
}

test.describe('with a notch and a home indicator', () => {
  test.use({ viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true });
  const INSET = { top: 0, left: 47, right: 47, bottom: 21 };

  test('the HUD and overlays stay inside the safe area', async ({ page, game }) => {
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Emulation.setSafeAreaInsetsOverride' as never, { insets: INSET } as never);
    await game(`G.Q = []; G.startSegment(2);`);
    const inside = async (el: Locator) => {
      const b = (await el.boundingBox())!;
      expect(b.x).toBeGreaterThanOrEqual(INSET.left);
      expect(b.x + b.width).toBeLessThanOrEqual(844 - INSET.right);
      expect(b.y + b.height).toBeLessThanOrEqual(390 - INSET.bottom);
    };
    await inside(page.getByTestId('hud-route-panel'));
    await inside(page.getByRole('button', { name: 'Pause' }));

    await page.getByRole('button', { name: 'Route Lines' }).click();
    await inside(page.getByRole('dialog', { name: 'MTA Transit Line Switching' }));
    await page.keyboard.press('Escape');

    await game(`G.pause();`);
    await inside(page.getByRole('button', { name: 'Resume Ride' }));
    await page.getByRole('button', { name: /Settings/ }).first().click();
    await inside(page.getByRole('dialog', { name: 'Settings' }).getByRole('heading', { name: 'Settings' }));
  });

  test('the camera viewfinder stays inside the safe area, on screen, and clear of the HUD and touch controls', async ({ page, game }) => {
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Emulation.setSafeAreaInsetsOverride' as never, { insets: INSET } as never);
    await game(`G.Q = []; G.startSegment(2); window.__P.toggleViewfinder(); G.notifyUI();`);
    const lower = page.getByRole('button', { name: 'Lower Camera' });
    await expect(lower).toBeVisible();
    for (const el of [lower, page.getByRole('button', { name: /^Evidence Log/ }), page.getByRole('button', { name: /SNAP PHOTO/ })]) {
      const b = (await el.boundingBox())!;
      expect(b.x).toBeGreaterThanOrEqual(INSET.left);
      expect(b.x + b.width).toBeLessThanOrEqual(844 - INSET.right);
      expect(b.y).toBeGreaterThanOrEqual(0);
      expect(b.y + b.height).toBeLessThanOrEqual(390 - INSET.bottom);
    }
    // The HUD's own top bar and the touch WALK / FLAG controls step aside under the viewfinder.
    await expect(page.getByTestId('hud-route-panel')).toBeHidden();
    await expect(page.getByRole('button', { name: 'Pause' })).toBeHidden();
    await expect(page.getByText('hold to catch')).toHaveCount(0);
    // Lowering the camera brings them back.
    await lower.click();
    await expect(page.getByTestId('hud-route-panel')).toBeVisible();
    await expect(page.getByText('hold to catch')).toBeVisible();
  });
});

test.describe('on a short landscape phone', () => {
  test.use({ viewport: { width: 640, height: 360 }, hasTouch: true, isMobile: true });
  test('the viewfinder’s Snap Photo button and the recorder’s buttons fit and are big enough to tap', async ({ page, game }) => {
    await game(`G.Q = []; G.startSegment(2); window.__P.toggleViewfinder(); G.notifyUI();`);
    const snap = (await page.getByRole('button', { name: /SNAP PHOTO/ }).boundingBox())!;
    expect(snap.y + snap.height).toBeLessThanOrEqual(360);
    await game(`window.__P.setViewfinder(false); window.__EVP.hasRecorder = true; G.toggleRecorder(); G.notifyUI();`);
    for (const name of ['Lower recorder', 'Tune down', 'Tune up', 'Tune down 5 kHz', 'Tune up 5 kHz']) {
      const b = (await page.getByRole('button', { name, exact: true }).boundingBox())!;
      expect(Math.min(b.width, b.height), name).toBeGreaterThanOrEqual(34);
    }
  });
});
