import type { Page } from '@playwright/test';
import { test, expect, board } from './game';

// Hold a key until the game clock has advanced `gt` seconds; returns how far the view target moved.
const hold = async (page: any, game: any, code: string, gt: number) => {
  await game(`G.ty = -1.2; G.tp = -0.3; window.__k0 = { ty: G.ty, tp: G.tp, gt: G.GT };`);
  await page.keyboard.down(code);
  await game(`await waitGT(${gt});`);
  await page.keyboard.up(code);
  return game(`await sleep(150); return { dty: G.ty - window.__k0.ty, dtp: G.tp - window.__k0.tp, dgt: G.GT - window.__k0.gt };`);
};

test.describe('keyboard look', () => {
  test('a held key turns the view smoothly, scaled by look speed, and stops on release', async ({ page, game }) => {
    await game(`ride(0);`);
    // A single keydown with no OS auto-repeat: the old stepped look moved 0.08 rad once and stopped.
    const r1 = await hold(page, game, 'ArrowLeft', 0.6);
    const rate1 = r1.dty / r1.dgt;
    expect(rate1).toBeGreaterThan(1.4);
    expect(rate1).toBeLessThan(2.0); // ≈1.8 rad/s
    await page.evaluate(() => (window as any).__S.set({ lookSensitivity: 2 }));
    const r2 = await hold(page, game, 'ArrowLeft', 0.4);
    expect(r2.dty / r2.dgt / rate1).toBeGreaterThan(1.7); // ≈2x
    expect(r2.dty / r2.dgt).toBeLessThan(5.5); // still under the head-whip threshold
    const still = await game(`const a = G.ty; await sleep(400); return G.ty - a;`);
    expect(still).toBe(0);
    const up = await hold(page, game, 'ArrowUp', 0.4);
    expect(up.dtp).toBeGreaterThan(0.3);
    expect(up.dty).toBe(0);
  });

  test('arrows turn the view during an answer prompt; WASD walks instead of turning', async ({ page, game }) => {
    await game(`ride(0); G.choice = { items: [{ txt: 'a', val: 0 }], window: 1e9, left: 1e9, gT: 0, glitch: 0, keyMap: [0], onPick: () => {} };`);
    const arrow = await hold(page, game, 'ArrowLeft', 0.3);
    expect(arrow.dty).toBeGreaterThan(0.2);
    await game(`G.choice = null;`);
    const wasd = await hold(page, game, 'KeyA', 0.3);
    expect(wasd.dty).toBe(0);
  });

  test('losing window focus stops walking and turning', async ({ page, game }) => {
    await game(`ride(0);`);
    await page.keyboard.down('KeyW');
    await page.keyboard.down('ArrowLeft');
    const walking = await game(`await sleep(100); return G.moveFwd;`);
    expect(walking).toBe(1);
    await page.evaluate(() => window.dispatchEvent(new Event('blur'))); // the key-ups never arrive
    const after = await game(`await sleep(50); const ty = G.ty; await waitGT(0.3); return { fwd: G.moveFwd, turned: G.ty - ty };`);
    expect(after).toEqual({ fwd: 0, turned: 0 });
    // A later key press must not resume the stale W.
    await page.keyboard.down('KeyD');
    expect(await game(`await sleep(100); return [G.moveFwd, G.moveRight];`)).toEqual([0, 1]);
    for (const k of ['KeyD', 'KeyW', 'ArrowLeft']) await page.keyboard.up(k);
  });

  test('pausing forgets held keys', async ({ page, game }) => {
    await game(`ride(0); G.ty = -1;`);
    await page.keyboard.down('ArrowLeft');
    await game(`await waitGT(0.2);`);
    await page.keyboard.press('KeyP'); // pause while still holding
    await game(`await sleep(200);`);
    await page.keyboard.press('KeyP'); // resume (the keyup arrives later, or never)
    const a = await game(`await sleep(100); return G.ty;`);
    const b = await game(`await waitGT(0.4); return G.ty;`);
    await page.keyboard.up('ArrowLeft');
    expect(b - a).toBe(0);
  });
});

test.describe('Esc', () => {
  test('pauses and resumes a ride', async ({ page, game }) => {
    await game(`ride(0);`);
    await page.keyboard.press('Escape');
    expect(await game(`await sleep(150); return G.paused`)).toBe(true);
    await page.keyboard.press('Escape');
    expect(await game(`await sleep(150); return G.paused`)).toBe(false);
  });

  test('cancels the Restart confirmation instead of resuming', async ({ page, game }) => {
    await game(`ride(0);`);
    await page.keyboard.press('KeyP');
    await page.getByRole('button', { name: 'Restart Ride' }).click();
    await expect(page.locator('[role=alertdialog]')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('[role=alertdialog]')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Restart Ride' })).toBeVisible();
    expect(await game(`return G.paused`)).toBe(true);
    await page.keyboard.press('Escape'); // nothing left on top: now it resumes
    expect(await game(`await sleep(150); return G.paused`)).toBe(false);
  });

  test('in Settings, cancels the erase confirmation first, then closes the panel', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.setItem('gtrain-tapes', JSON.stringify({ 'passenger-hoyt': { first: 1, count: 1 } })));
    await page.getByRole('button', { name: 'Settings' }).click();
    const d = page.locator('[role=dialog][aria-labelledby=settings-title]');
    await d.getByRole('button', { name: 'Erase saved progress' }).click();
    await expect(d.locator('[role=alertdialog]')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(d.locator('[role=alertdialog]')).toHaveCount(0);
    await expect(d).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(d).toHaveCount(0);
  });
});

test.describe('Case Files on the start screen', () => {
  const seedArchive = async (page: Page) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.setItem('gtrain-psychlog', JSON.stringify({
      stare: { seen: 2, caught: 1, first: 1 }, adswap: { seen: 1, caught: 1, first: 1 }, momface: { seen: 1, caught: 0, first: 1 },
    })));
    await page.reload();
  };

  test('shows the documented count, closes with Esc, and updates after erasing progress', async ({ page }) => {
    await seedArchive(page);
    const btn = page.getByRole('button', { name: /Case Files/ });
    await expect(btn).toHaveText(/2\/13/);
    await btn.click();
    const dlg = page.getByRole('dialog', { name: 'Case Files & Career Archive' });
    await expect(dlg).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(dlg).toHaveCount(0);

    await page.getByRole('button', { name: 'Settings' }).click();
    await page.getByRole('button', { name: 'Erase saved progress' }).click();
    await page.locator('[role=alertdialog]').getByRole('button', { name: 'Erase' }).click();
    await page.keyboard.press('Escape');
    await expect(btn).toHaveText(/0\/13/);
  });

  test('the dossier lists the anomalies saved on this device', async ({ page }) => {
    await seedArchive(page);
    await page.getByRole('button', { name: /Case Files/ }).click();
    const dlg = page.getByRole('dialog', { name: 'Case Files & Career Archive' });
    await expect(dlg.getByText(/^Anomalies: /)).toHaveText('Anomalies: 2/13', { timeout: 3_000 });
    await expect(dlg.getByText('DOCUMENTED', { exact: true })).toHaveCount(2, { timeout: 3_000 });
    await expect(dlg.getByText('UNCONFIRMED', { exact: true })).toHaveCount(1, { timeout: 3_000 });
  });
});

test('tier-change whisper plays only when sanity drops a tier', async ({ game }) => {
  const calls = await game(`G.Q = []; window.__tw = []; const o = A.tierTransitionWhisper.bind(A);
    A.tierTransitionWhisper = (t) => { window.__tw.push(t); o(t); };
    toTier(100, 0); toTier(60, 1); toTier(5, 3); toTier(25, 2); toTier(100, 0); return window.__tw;`);
  expect(calls).toEqual([1, 3]);
});
