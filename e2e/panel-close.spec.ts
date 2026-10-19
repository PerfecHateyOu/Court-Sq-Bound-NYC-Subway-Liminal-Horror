import { test, expect, type Run } from './game';
import type { Page } from '@playwright/test';

// Closing a panel puts the player back where they were: the ride running (or paused) as before,
// nothing left over the view, and the keys working again.

/** After a panel closes mid-ride: running, nothing covering the view, arrow keys turn it. */
async function backInTheRide(page: Page, game: Run) {
  expect(await game(`return G.paused;`)).toBe(false);
  await expect(page.getByRole('dialog')).toHaveCount(0);
  const onTop = await page.evaluate(() => {
    const el = document.elementFromPoint(innerWidth / 2, innerHeight / 2);
    return el?.tagName;
  });
  expect(onTop, 'the 3D view is what a tap in the middle reaches').toBe('CANVAS');
  // As in controls.spec: start well inside the turning range, hold for some game time.
  const ty0 = await game(`G.ty = -1.2; return G.ty;`);
  await page.keyboard.down('ArrowLeft');
  await game(`await waitGT(0.3);`);
  await page.keyboard.up('ArrowLeft');
  expect(Math.abs((await game(`return G.ty;`)) - ty0), 'arrow keys turn the view').toBeGreaterThan(0.1);
}

/** Pretend the mouse is captured for looking (headless browsers can't lock the pointer). */
const fakeMouseLock = (page: Page) =>
  page.evaluate(() => {
    let locked: Element | null = document.querySelector('canvas');
    Object.defineProperty(document, 'pointerLockElement', { configurable: true, get: () => locked });
    document.exitPointerLock = () => {
      locked = null;
      document.dispatchEvent(new Event('pointerlockchange'));
    };
  });

test.describe('Evidence log', () => {
  test('Tab opens it mid-ride and frees a captured mouse without pausing; Esc closes it', async ({ page, game }) => {
    await game(`ride(2);`);
    await fakeMouseLock(page);
    await page.keyboard.press('Tab');
    await expect(page.getByRole('tablist', { name: 'Evidence' })).toBeVisible();
    expect(await game(`return [G.paused, !!document.pointerLockElement];`)).toEqual([false, false]);

    await page.keyboard.press('Escape');
    await expect(page.getByRole('tablist', { name: 'Evidence' })).toHaveCount(0);
    await backInTheRide(page, game);
  });

  test('Esc closes an enlarged print first, then the log; Tab closes it too', async ({ page, game }) => {
    await game(`ride(2); await sleep(300); G.takePolaroidPhoto(); window.__P.setAlbum(true);`);
    await page.locator('div.grid > div.cursor-pointer').first().click(); // a print
    const closePhoto = page.getByRole('button', { name: 'Close photo' });
    await expect(closePhoto).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(closePhoto).toHaveCount(0);
    await expect(page.getByRole('tablist', { name: 'Evidence' })).toBeVisible(); // the log is still open
    await page.keyboard.press('Escape');
    await expect(page.getByRole('tablist', { name: 'Evidence' })).toHaveCount(0);
    await backInTheRide(page, game);

    await page.keyboard.press('Tab');
    await expect(page.getByRole('tablist', { name: 'Evidence' })).toBeVisible();
    await page.keyboard.press('Tab');
    await expect(page.getByRole('tablist', { name: 'Evidence' })).toHaveCount(0);
    await backInTheRide(page, game);
  });
});

test('the route selector, closed by Esc, L or its button, leaves the ride running and the keys working', async ({ page, game }) => {
  await game(`ride(2);`);
  const dialog = page.getByRole('dialog', { name: 'MTA Transit Line Switching' });
  await page.keyboard.press('KeyL');
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await backInTheRide(page, game);
  await page.keyboard.press('KeyL');
  await page.keyboard.press('KeyL');
  await expect(dialog).toHaveCount(0);
  await backInTheRide(page, game);
  await page.keyboard.press('KeyL');
  await dialog.getByRole('button', { name: 'Close route selector' }).click();
  await backInTheRide(page, game);
});

test('Settings from the pause menu goes back to the pause menu, and Resume goes back to the ride', async ({ page, game }) => {
  await game(`ride(2); G.pause();`);
  await page.getByRole('button', { name: /Settings/ }).first().click();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog', { name: 'Settings' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Resume Ride' })).toBeVisible();
  expect(await game(`return G.paused;`)).toBe(true);
  await page.getByRole('button', { name: 'Resume Ride' }).click();
  await backInTheRide(page, game);
});

test('Case Files on the report close with Esc, back to the report', async ({ page, game }) => {
  await game(`ride(2); await sleep(300); G.takePolaroidPhoto(); G.peak = 5; G.finalExitChoice = 'escalators'; G.endGame(); await sleep(300);`);
  await page.getByRole('button', { name: /Case Files/ }).first().click();
  const dialog = page.getByRole('dialog').last();
  await expect(dialog).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByRole('button', { name: /Ride Again|Get back on/ }).first()).toBeVisible(); // back on the report
});
