import { test, expect, type Page } from '@playwright/test';
import { runner, watchErrors } from './game';

// #76: the practice stretch. It runs before the first ride (skippable), and again from the title
// screen. This spec uses the plain fixture: the shared one marks the tutorial seen.

const fresh = async (page: Page, seen = false) => {
  await page.goto('/');
  await page.evaluate((s) => {
    localStorage.clear();
    localStorage.setItem('gtrain-settings', JSON.stringify({ fullscreenOnBoard: false }));
    if (s) localStorage.setItem('gtrain-tutorial', 'done');
  }, seen);
  await page.reload();
};
const boardTrain = async (page: Page) => {
  await page.getByRole('button', { name: 'Board the Train' }).click();
  await page.waitForFunction(() => (window as any).__G?.phase !== 'menu');
  return runner(page);
};
const coach = (page: Page) => page.getByRole('region', { name: 'Practice stretch' });

// Aim at a point in the car (world coordinates).
const AIM = `const aimAt = (x, y, z) => { const e = G.eyePos; const dx = x - e.x, dy = y - e.y, dz = z - e.z;
  G.ty = G.yaw = Math.atan2(-dx, -dz); G.tp = G.pitch = Math.atan2(dy, Math.hypot(dx, dz)); };`;

test.describe('Practice stretch', () => {
  test('the first ride starts with it; Skip goes straight to the ride, and it doesn’t come back', async ({ page }) => {
    const errs = watchErrors(page);
    await fresh(page);
    const game = await boardTrain(page);
    await expect(coach(page)).toBeVisible();
    await expect(coach(page)).toContainText('1 of 4');
    await expect(coach(page)).toContainText('Look around');
    expect(await game(`return { phase: G.phase, step: G.tutorial.step, practice: true };`)).toMatchObject({ phase: 'intro', step: 'look' });

    await coach(page).getByRole('button', { name: 'Skip practice' }).click();
    await expect(coach(page)).toHaveCount(0);
    expect(await game(`return { tut: G.tutorial, seen: localStorage.getItem('gtrain-tutorial') };`)).toEqual({ tut: null, seen: 'done' });
    expect(await game(`advance(12); return G.phase;`)).toBe('ride');

    await page.reload();
    await boardTrain(page);
    await page.waitForTimeout(300);
    await expect(coach(page)).toHaveCount(0);
    expect(errs).toEqual([]);
  });

  test('the whole lesson: look, flag, answer Mom, read the doors, then a fresh ride', async ({ page }) => {
    const errs = watchErrors(page);
    await fresh(page);
    const game = await boardTrain(page);

    // 1. Look left and right.
    await game(`G.ty = 1.3; advance(0.3); G.ty = -1.3; advance(0.3);`);
    await expect(coach(page)).toContainText('turn all the way around');
    await expect(coach(page).getByRole('button', { name: 'Next' })).toBeVisible();
    await game(`advance(3);`);
    expect(await game(`return G.tutorial.step;`)).toBe('flag');

    // 2. Look away: the sticker appears on the window across the aisle.
    expect(await game(`G.ty = G.yaw = 1.6; advance(1.2); return G.carBuilder.panes[3].decal.visible;`)).toBe(true);
    await expect(coach(page)).toContainText('just changed');
    // A wrong flag is named as wrong here (and only here).
    await game(`${AIM} const ad = G.carBuilder.acrossAds.find((a) => Math.abs(a.mesh.position.x - 2.6) < 0.1).mesh.getWorldPosition(G.eyePos.clone());
      aimAt(ad.x, ad.y, ad.z); advance(0.1); G.flagHeld = true; advance(1.0); G.flagHeld = false; advance(0.1);`);
    await expect(coach(page)).toContainText('Not that');
    // The right one.
    await game(`${AIM} const p = G.carBuilder.panes[3].decal.getWorldPosition(G.eyePos.clone()); aimAt(p.x, p.y, p.z); advance(0.1);
      G.flagHeld = true; advance(1.0); G.flagHeld = false; advance(0.1);`);
    await expect(coach(page)).toContainText('flags are private');
    await page.keyboard.press('Enter');
    expect(await game(`return { step: G.tutorial.step, sticker: G.carBuilder.panes[3].decal.visible };`)).toEqual({ step: 'mask', sticker: false });

    // 3. Mom watches, then asks; the calm answer.
    await expect(coach(page)).toContainText('Mom is watching you');
    expect(await game(`advance(3.7); return !!G.choice;`)).toBe(true);
    await game(`const i = G.choice.items.findIndex((c) => c.val === 'calm'); G.pickChoiceIndex(i); advance(0.1);`);
    await expect(coach(page)).toContainText('Answer like nothing is wrong');
    expect(await game(`advance(4.2); return G.tutorial.step;`)).toBe('doors');

    // 4. The doors: a real stop, then the two ticks, with the ride's own timings.
    const doors = await game(`const chimes = []; const ch = A.chime.bind(A); A.chime = () => { chimes.push(G.GT); ch(); };
      const opens = []; let last = G.doorTarget; let flicker = false;
      for (let i = 0; i < 400 && G.tutorial.step === 'doors' && !G.tutorial.view.canNext; i++) { advance(0.05);
        if (G.doorTarget === 1 && last === 0) opens.push(G.GT); last = G.doorTarget; if (G.flickerUntil > G.GT) flicker = true; }
      A.chime = ch; return { delays: chimes.map((c, k) => +(opens[k] - c).toFixed(2)), flicker };`);
    expect(doors.delays).toHaveLength(3);
    expect(doors.delays[0]).toBeCloseTo(1.95, 1); // real: after the chime
    expect(doors.delays[1]).toBeCloseTo(1.15, 1); // tick: before the chime finishes
    expect(doors.delays[2]).toBeCloseTo(1.95, 1); // the flicker tick
    expect(doors.flicker).toBe(true);
    await expect(coach(page)).toContainText('The tick never lies');
    await game(`advance(6.2);`);
    await expect(coach(page).getByRole('button', { name: 'Start the ride' })).toBeVisible();

    // Done: a fresh ride (nothing from the lesson carries over).
    await coach(page).getByRole('button', { name: 'Start the ride' }).click();
    await expect(coach(page)).toHaveCount(0);
    const ride = await game(`advance(12); return { phase: G.phase, sus: G.sus, flags: G.segFlags.length, tut: G.tutorial, seen: localStorage.getItem('gtrain-tutorial') };`);
    expect(ride).toEqual({ phase: 'ride', sus: 0, flags: 0, tut: null, seen: 'done' });
    expect(errs).toEqual([]);
  });

  test('nothing in it counts: odd answers and a timeout leave the ride untouched', async ({ page }) => {
    await fresh(page);
    const game = await boardTrain(page);
    const r = await game(`G.tutorial.lookedLeft = G.tutorial.lookedRight = true; advance(0.1); G.tutorial.next(); G.tutorial.next();
      // On to the mask lesson directly, and answer oddly.
      G.tutorial.view.canNext = true; G.tutorial.next(); advance(3.7);
      const i = G.choice.items.findIndex((c) => c.val === 'off'); G.pickChoiceIndex(i); advance(0.1);
      const lesson = G.tutorial.view.body; G.finishTutorial(true); advance(12);
      return { lesson, sus: G.sus, runs: localStorage.getItem('gtrain-runs'), phase: G.phase };`);
    expect(r.lesson).toContain('would raise her Suspicion');
    expect(r).toMatchObject({ sus: 0, runs: null, phase: 'ride' });
  });

  test('the title screen replays it any time, and Restart from the pause menu leaves it for the ride', async ({ page }) => {
    await fresh(page, true);
    await page.getByRole('button', { name: 'Practice stretch' }).click();
    await page.waitForFunction(() => (window as any).__G?.phase !== 'menu');
    const game = runner(page);
    await expect(coach(page)).toBeVisible();
    await page.keyboard.press('KeyP');
    // Restart never asks "are you sure" (Williams, Oct 23), so the practice stretch ends at once.
    await page.getByRole('button', { name: /Restart Ride/i }).click();
    await expect(page.locator('[role=alertdialog]')).toHaveCount(0);
    await expect(coach(page)).toHaveCount(0);
    expect(await game(`return { tut: G.tutorial, phase: G.phase };`)).toEqual({ tut: null, phase: 'intro' });
  });
});
