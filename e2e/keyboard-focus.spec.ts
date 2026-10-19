import { test, expect, board } from './game';
import type { Locator, Page } from '@playwright/test';

// Keyboard play from a fresh start: every menu takes focus when it opens, Tab never wanders onto
// the HUD or menu hidden behind it, closing a panel hands focus back, and focus always shows.

/** Presses Tab `n` times and returns the accessible label of each control it lands on. */
async function tabs(page: Page, n: number, shift = false): Promise<string[]> {
  const out: string[] = [];
  for (let i = 0; i < n; i++) {
    await page.keyboard.press(shift ? 'Shift+Tab' : 'Tab');
    out.push(
      await page.evaluate(() => {
        const e = document.activeElement as HTMLElement | null;
        if (!e || e === document.body) return '(page)';
        return e.getAttribute('aria-label') || e.id || (e.textContent || '').trim();
      }),
    );
  }
  return out;
}

/** Every Tab stop is inside `dialog`, and Tab comes back round to where it started. */
async function expectTrapped(page: Page, dialog: Locator, n: number) {
  const start = await page.evaluateHandle(() => document.activeElement);
  for (let i = 0; i < n; i++) {
    await page.keyboard.press('Tab');
    expect(await dialog.evaluate((d) => d.contains(document.activeElement)), `Tab ${i + 1} stays in the dialog`).toBe(true);
  }
  for (let i = 0; i < n; i++) await page.keyboard.press('Shift+Tab');
  expect(await page.evaluate((s) => document.activeElement === s, start), 'Shift+Tab comes back').toBe(true);
}

/** The focused control draws a focus ring (an outline, or a ring drawn as a box shadow). */
async function expectFocusShows(page: Page) {
  const ring = await page.evaluate(() => {
    const e = document.activeElement as HTMLElement;
    const cs = getComputedStyle(e);
    return { outline: cs.outlineStyle !== 'none', shadow: cs.boxShadow !== 'none', name: e.getAttribute('aria-label') || e.textContent?.trim() };
  });
  expect(ring.outline || ring.shadow, `focus ring on ${ring.name}`).toBe(true);
}

test('from a fresh start the whole loop plays from the keyboard', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.setItem('gtrain-settings', JSON.stringify({ fullscreenOnBoard: false })));
  await page.reload();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'Board the Train' })).toBeFocused();
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => (window as any).__G?.phase !== 'menu');

  // P pauses with focus on Resume; Enter resumes.
  await page.keyboard.press('KeyP');
  const pause = page.getByRole('dialog', { name: 'Train Paused' });
  await expect(pause.getByRole('button', { name: 'Resume Ride' })).toBeFocused();
  await expectFocusShows(page);
  await page.keyboard.press('Enter');
  await expect(pause).toHaveCount(0);
  expect(await page.evaluate(() => (window as any).__G.paused)).toBe(false);

  // L opens the route selector without pausing; picking a line closes it and the ride goes on.
  await page.keyboard.press('KeyL');
  const selector = page.getByRole('dialog', { name: 'MTA Transit Line Switching' });
  await expect(selector).toBeVisible();
  await page.keyboard.press('Tab');
  await page.keyboard.press('Enter');
  await expect(selector).toHaveCount(0);
  expect(await page.evaluate(() => [(window as any).__G.paused, (window as any).__RT.routeId])).toEqual([false, 'L']);

  // The pause menu then names the new line's next stop.
  await page.keyboard.press('Escape');
  await expect(pause.getByRole('button', { name: 'Resume Ride' })).toBeFocused();
  await expect(page.getByTestId('pause-line')).toContainText(/Canarsie/i);
  await page.keyboard.press('Escape');
  expect(await page.evaluate(() => (window as any).__G.paused)).toBe(false);
});

test('Tab stays in the pause menu, never reaching the HUD behind it', async ({ page, game }) => {
  await game(`ride(2);`);
  await page.keyboard.press('KeyP');
  const pause = page.getByRole('dialog', { name: 'Train Paused' });
  await expect(pause.getByRole('button', { name: 'Resume Ride' })).toBeFocused();
  await expectTrapped(page, pause, 6);
  expect(await tabs(page, 6)).not.toContain('Pause');

  // With the restart confirmation up, Tab cycles through it too; Esc cancels it.
  await pause.getByRole('button', { name: 'Restart Ride' }).click();
  await expect(pause.getByRole('button', { name: 'Restart', exact: true })).toBeFocused();
  await expectTrapped(page, pause, 6);
  await page.keyboard.press('Escape');
  expect(await page.evaluate(() => (window as any).__G.paused)).toBe(true);
});

test('Settings over the pause menu holds focus, then hands it back to the Settings button', async ({ page, game }) => {
  await game(`ride(2);`);
  await page.keyboard.press('KeyP');
  const pause = page.getByRole('dialog', { name: 'Train Paused' });
  await page.keyboard.press('Tab'); // Resume -> Settings
  const opener = pause.getByRole('button', { name: 'Settings' });
  await expect(opener).toBeFocused();
  await expectFocusShows(page);
  await page.keyboard.press('Enter');

  const settings = page.getByRole('dialog', { name: 'Settings' });
  await expect(settings).toBeVisible();
  await expectTrapped(page, settings, 14);
  for (let i = 0; i < 4; i++) {
    await page.keyboard.press('Tab');
    await expectFocusShows(page);
  }
  await page.keyboard.press('Escape');
  await expect(settings).toHaveCount(0);
  await expect(opener).toBeFocused();
  expect(await page.evaluate(() => (window as any).__G.paused)).toBe(true);
});

test('on the start screen, Settings and the Case Files hold focus and hand it back', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();

  const openSettings = page.getByRole('button', { name: 'Settings' });
  await openSettings.focus();
  await page.keyboard.press('Enter');
  const settings = page.getByRole('dialog', { name: 'Settings' });
  await expectTrapped(page, settings, 12);
  await page.keyboard.press('Escape');
  await expect(openSettings).toBeFocused();

  const openFiles = page.getByRole('button', { name: /Case Files/ });
  await openFiles.focus();
  await page.keyboard.press('Enter');
  const files = page.getByRole('dialog', { name: /Case Files/ });
  await expect(files).toBeVisible();
  expect(await files.evaluate((d) => d.contains(document.activeElement)), 'focus moves into the Case Files').toBe(true);
  await expectTrapped(page, files, 10);
  await page.keyboard.press('Escape');
  await expect(openFiles).toBeFocused();
});

test('look speed and invert-Y set in Settings apply mid-ride at once and survive a reload', async ({ page }) => {
  const game = await board(page);
  await game(`G.Q = [];`);
  // Touch-style drag on the canvas (headless pointer lock sends erratic mouse deltas).
  const drag = () =>
    game<{ ty: number; tp: number }>(`G.ty = 0; G.tp = 0; const c = R.renderer.domElement; const x = 320, y = 180;
      const ev = (type, cx, cy) => c.dispatchEvent(new PointerEvent(type, { pointerId: 7, pointerType: 'touch', clientX: cx, clientY: cy, bubbles: true }));
      ev('pointerdown', x, y); for (let i = 1; i <= 10; i++) ev('pointermove', x - 40 * i / 10, y - 20 * i / 10); ev('pointerup', x - 40, y - 20);
      return { ty: G.ty, tp: G.tp };`);
  const base = await drag();

  await page.keyboard.press('KeyP');
  await page.getByRole('button', { name: 'Settings' }).click();
  const settings = page.getByRole('dialog', { name: 'Settings' });
  await settings.getByLabel('Look speed').fill('2');
  await settings.getByLabel(/Invert/i).check();
  await page.keyboard.press('Escape');
  await page.keyboard.press('KeyP');
  const live = await drag();
  expect(live.ty / base.ty).toBeCloseTo(2, 3);
  expect(live.tp / base.tp).toBeCloseTo(-2, 3);

  const again = await board(page, { keepStorage: true });
  await again(`G.Q = [];`);
  const reloaded = await drag();
  expect(reloaded.ty).toBeCloseTo(live.ty, 4);
  expect(reloaded.tp).toBeCloseTo(live.tp, 4);
  await page.keyboard.press('KeyP');
  await page.getByRole('button', { name: 'Settings' }).click();
  await expect(settings.getByLabel('Look speed')).toHaveValue('2');
  await expect(settings.getByLabel(/Invert/i)).toBeChecked();
});
