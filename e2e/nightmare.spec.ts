import { test, expect } from './game';

test.describe('Nightmare mode', () => {
  test('is locked until a ride is finished, then can be chosen on the start screen', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.clear();
      localStorage.setItem('gtrain-settings', JSON.stringify({ fullscreenOnBoard: false }));
    });
    await page.reload();
    await expect(page.getByTestId('nightmare-locked')).toContainText('finish a ride to unlock');
    await expect(page.getByRole('checkbox', { name: 'Nightmare mode' })).toHaveCount(0);

    await page.evaluate(() => localStorage.setItem('gtrain-runs', JSON.stringify([{ date: 1, san: 50, sanPct: 50, peak: 10, acc: { correct: 1, miss: 1, fp: 0 }, trials: 0 }])));
    await page.reload();
    await page.getByRole('checkbox', { name: 'Nightmare mode' }).check();
    await page.locator('text=/Board the train/i').click();
    await page.waitForFunction(() => (window as any).__G?.phase !== 'menu');
    expect(await page.evaluate(() => (window as any).__G.nightmare)).toBe(true);
    await page.evaluate(() => (window as any).__G.pause());
    await expect(page.getByText('NIGHTMARE MODE')).toBeVisible();
  });

  test('a faster train and shorter rides; mask checks move up with them', async ({ game }) => {
    const r = await game(`const seg = (i) => { G.Q = []; G.startSegment(i); return G.seg; };
      const measure = () => { const s = seg(7); return { len: G.segLen(s), dist: G.segDist(s), speed: G.topSpeed, masks: s._masks.map((m) => m.t) }; };
      G.nightmare = false; const normal = measure(); G.nightmare = true; const hard = measure(); G.nightmare = false;
      return { normal, hard };`);
    expect(r.normal).toMatchObject({ len: 37, speed: 14, masks: [9, 22] });
    expect(r.hard.speed).toBeCloseTo(16.8, 5);
    expect(r.hard.len).toBeCloseTo(5 + 19.5 + 6, 5);
    expect(r.hard.masks).toEqual([6.75, 16.5]);
    expect(r.hard.dist / r.normal.dist).toBeGreaterThan(0.8); // a bit less track, much less time
    expect(r.hard.len / r.normal.len).toBeLessThan(0.85);
  });

  test('sanity drifts faster, still inside each stop’s band', async ({ game }) => {
    // Start inside the stop's band (above its ceiling, both would clamp to the same value).
    const r = await game(`const drift = (nm, i) => { G.nightmare = nm; G.Q = []; G.san = G.getBand(SEGS_STOP[i])[1] - 15; G.startSegment(i); return G.san; };
      const SEGS_STOP = { 1: 3, 3: 5 };
      // Stop 3 has no normal drift; Stop 5's is -5.
      return { normal3: drift(false, 1), hard3: drift(true, 1), normal5: drift(false, 3), hard5: drift(true, 3) };`);
    expect(r.hard3).toBeLessThan(r.normal3);
    expect(r.hard5).toBeLessThan(r.normal5);
  });

  test('a parent who isn’t watching is likelier to turn and look', async ({ game }) => {
    const r = await game(`ride(2); const real = Math.random; const mom = G.carBuilder.parents[0], dad = G.carBuilder.parents[1];
      const tryLook = (nm) => { G.nightmare = nm; [mom, dad].forEach((p) => { p.force = false; p.mode = 'phone'; p.until = 0; p.holdUntil = 0; });
        dad.until = G.GT + 100; Math.random = () => 0.7; G.updateParents(0.016, true); Math.random = real; return mom.mode; };
      const out = { normal: tryLook(false), nightmare: tryLook(true) }; G.nightmare = false; return out;`);
    expect(r.normal).not.toBe('player');
    expect(r.nightmare).toBe('player');
  });

  test('single tubes flicker mid-ride only: never the whole car, never near the stations, never under Reduced', async ({ game }) => {
    const r = await game(`window.__S.set({ screenEffects: 'full' }); ride(1); G.seg._masks = [];
      const segs = G.carBuilder.lightSegs; const L = G.segLen(G.seg);
      const run = (nm) => { G.nightmare = nm; G.Q = []; G.startSegment(1); G.seg._masks = []; G.active.forEach((a) => (a.trigger = 999));
        let outs = 0, allOut = 0, early = 0, late = 0;
        for (let i = 0; i < 2000 && G.phase === 'ride'; i++) { advance(0.05);
          const off = segs.filter((s) => !s.m.visible).length;
          if (off && G.GT >= G.flickerUntil) { outs++; if (off === segs.length) allOut++; if (G.ts < 3) early++; if (G.ts > G.segLen(G.seg) - 6 - 8) late++; } }
        return { outs, allOut, early, late }; };
      const nightmare = run(true); const normal = run(false);
      window.__S.set({ screenEffects: 'reduced' }); const reduced = run(true); window.__S.set({ screenEffects: 'full' }); G.nightmare = false;
      return { nightmare, normal, reduced };`);
    expect(r.nightmare.outs).toBeGreaterThan(0);
    expect(r.nightmare).toMatchObject({ allOut: 0, early: 0, late: 0 });
    expect(r.normal.outs).toBe(0);
    expect(r.reduced.outs).toBe(0);
  });

  test('the report and ride history mark a Nightmare ride; normal rides aren’t marked', async ({ page, game }) => {
    await game(`G.nightmare = true; G.peak = 20; G.finalExitChoice = 'escalators'; G.endGame();`);
    await expect(page.getByTestId('nightmare-tag')).toHaveText('NIGHTMARE');
    const runs = await page.evaluate(() => JSON.parse(localStorage.getItem('gtrain-runs')!));
    expect(runs[runs.length - 1].nightmare).toBe(true);

    await page.getByRole('button', { name: 'Ride Again' }).click();
    expect(await game(`return G.nightmare;`)).toBe(true); // kept for Ride Again
    await game(`G.nightmare = false; G.peak = 20; G.finalExitChoice = 'escalators'; G.endGame();`);
    await expect(page.getByTestId('nightmare-tag')).toHaveCount(0);
  });
});
