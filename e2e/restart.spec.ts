import { test, expect } from './game';

test.describe('flags and restart', () => {
  test('the flag sound is the same for real and false flags, once per target', async ({ game }) => {
    const r = await game(`ride(0); await sleep(300);
      let n = 0; const o = A.flagRegistered.bind(A); A.flagRegistered = () => { n++; o(); };
      const a = G.active[0]; a.apply(); a.at = G.GT;
      flag(a.tids[0]); const real = n; flag('mom'); const fals = n - real; flag('mom'); const dup = n - real - fals;
      return { real, fals, dup };`);
    expect(r).toEqual({ real: 1, fals: 1, dup: 0 });
  });

  test('Restart asks first, Cancel backs out, and a confirmed restart starts clean', async ({ page, game }) => {
    await game(`G.say(0, 'Leftover subtitle from the old ride', 30); G.setPA('Leftover PA', 30); G.san = 55; G.sus = 40; G.peak = 40;`);
    await page.keyboard.press('KeyP');
    await page.locator('text=/Restart Ride/i').click();
    const dialog = page.locator('[role=alertdialog]');
    await expect(dialog).toBeVisible();
    expect(await game(`return G.paused`)).toBe(true);
    await dialog.locator('text=/^Cancel$/').click();
    await expect(dialog).toHaveCount(0);
    expect(await game(`return G.paused && G.segIdx === 0`)).toBe(false); // still paused, nothing restarted
    expect(await game(`return G.paused`)).toBe(true);

    await page.locator('text=/Restart Ride/i').click();
    await dialog.locator('text=/^Restart$/').click();
    await page.waitForTimeout(500);
    const st = await game(`return { phase: G.phase, paused: G.paused, segIdx: G.segIdx, san: G.san, sus: G.sus, peak: G.peak, sub: G.subHtml, flags: G.segFlags.length,
      runs: JSON.parse(localStorage.getItem('gtrain-runs') || '[]').length }`);
    expect(st).toEqual({ phase: 'intro', paused: false, segIdx: -1, san: 100, sus: 0, peak: 0, sub: '', flags: 0, runs: 0 });
    await expect(page.locator('text=/Train Paused/i')).toHaveCount(0);
    await expect(page.locator('body')).not.toContainText(/Leftover subtitle|Leftover PA/);
  });

  test('restarting from a False Stop Trial restores the train and its hum', async ({ page, game }) => {
    const inTrial = await game(`G.Q = []; G.startSegment(2); G.startTrial(); await sleep(1500);
      await sleep(1500); return { phase: G.phase, bed: A.bedGain.gain.value };`);
    expect(inTrial.phase).toBe('trial');
    expect(inTrial.bed).toBeLessThan(0.2);
    await page.keyboard.press('KeyP');
    await page.locator('text=/Restart Ride/i').click();
    await page.locator('[role=alertdialog] >> text=/^Restart$/').click();
    const after = await game(`await sleep(1800); return { phase: G.phase, trialVisible: G.trialBuilder.group.visible,
      worldVisible: G.carBuilder.worldGroup.visible, trial: G.trial, bed: A.bedGain.gain.value };`);
    expect(after).toMatchObject({ phase: 'intro', trialVisible: false, worldVisible: true, trial: null });
    expect(after.bed).toBeGreaterThan(0.95);
  });

  test('Ride Again after the report restores full volume', async ({ page, game }) => {
    const end = await game(`G.endGame(); await sleep(3000); return A.masterGain.gain.value;`);
    expect(end).toBeLessThanOrEqual(0.25);
    await page.locator('text=/Ride Again/i').click();
    const again = await game(`await sleep(1800); return { master: A.masterGain.gain.value, bed: A.bedGain.gain.value };`);
    expect(again.master).toBeGreaterThan(0.8);
    expect(again.bed).toBeGreaterThan(0.95);
  });
});
