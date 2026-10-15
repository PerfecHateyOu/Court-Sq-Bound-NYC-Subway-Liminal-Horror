import { test, expect, board } from './game';

const TRACE_HASH = `const c = document.querySelector('[data-testid=heartbeat-trace]');
  const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let h = 0;
  for (let i = 0; i < d.length; i += 7) h = (h * 31 + d[i]) | 0; return h;`;

test.describe('heartbeat', () => {
  test('tier follows sanity and the screen grading follows the tier', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('[data-testid=heartbeat-trace]')).toHaveCount(0);
    const game = await board(page);
    const filter = () => page.evaluate(() => {
      const d = [...document.querySelectorAll('div')].find((x) => x.style?.filter && x.style.transition.includes('filter'));
      return d ? d.style.filter : null;
    });
    await game(`G.Q = []; toTier(100, 0); await sleep(400);`);
    expect(await filter()).toBe('none');
    await game(`toTier(5, 3); await sleep(500);`);
    expect(await filter()).toMatch(/saturate\(0\.3\)/);
  });

  test('rate per tier, irregular only at low sanity, thump only at Critical', async ({ game }) => {
    const rates = await game(`G.Q = []; window.__thumps = 0; const o = A.thump.bind(A); A.thump = (p) => { window.__thumps++; o(p); };
      const out = [];
      for (const [t, san] of [[0, 100], [1, 60], [2, 25], [3, 5]]) {
        toTier(san, t); G.heartBpm = [64, 82, 102, 118][t]; G.heartBeats = []; window.__thumps = 0; G.heartNextAt = G.GT;
        const beats = []; let last = G.heartBeats.length;
        for (let s = 0; s < 6.5; s += 0.02) { advance(0.02); if (G.heartBeats.length !== last || G.heartBeats.length === 12) {
          const b = G.heartBeats[G.heartBeats.length - 1]; if (!beats.length || b !== beats[beats.length - 1]) beats.push(b); last = G.heartBeats.length; } }
        const iv = []; for (let i = 2; i < beats.length; i++) iv.push(beats[i] - beats[i - 1]);
        const mean = iv.reduce((a, x) => a + x, 0) / iv.length;
        const sd = Math.sqrt(iv.reduce((a, x) => a + (x - mean) ** 2, 0) / iv.length);
        out.push({ bpm: 60 / mean, irregular: (sd / mean) * 100, beats: beats.length, thumps: window.__thumps });
      }
      return out;`);
    const want = [64, 82, 102, 118];
    rates.forEach((r: any, i: number) => {
      if (i) expect(r.bpm).toBeGreaterThan(rates[i - 1].bpm);
      expect(Math.abs(r.bpm - want[i])).toBeLessThanOrEqual(i < 3 ? 3 : 6);
    });
    expect(rates[0].irregular).toBeLessThan(0.5);
    expect(rates[3].irregular).toBeGreaterThan(rates[1].irregular);
    expect(rates.slice(0, 3).map((r: any) => r.thumps)).toEqual([0, 0, 0]);
    expect(Math.abs(rates[3].thumps - rates[3].beats)).toBeLessThanOrEqual(1);
  });

  test('rate eases toward a new tier instead of jumping', async ({ game }) => {
    const r = await game(`G.Q = []; toTier(100, 0); G.heartBpm = 64; toTier(5, 3); advance(0.95); const after1 = G.heartBpm; advance(8); return { after1, after9: G.heartBpm };`);
    expect(r.after1).toBeGreaterThan(66);
    expect(r.after1).toBeLessThan(100);
    expect(r.after9).toBeGreaterThan(115);
  });

  test('trace animates during play and freezes on pause', async ({ page, game }) => {
    await game(`G.Q = [];`);
    const h1 = await game(TRACE_HASH);
    await page.waitForTimeout(700);
    expect(await game(TRACE_HASH)).not.toBe(h1);
    await page.keyboard.press('KeyP');
    await page.waitForTimeout(500);
    const p1 = await game(TRACE_HASH);
    await page.waitForTimeout(900);
    expect(await game(TRACE_HASH)).toBe(p1);
  });
});

test.describe('heartbeat with reduced motion', () => {
  test.use({ contextOptions: { reducedMotion: 'reduce' } });
  test('trace stays still', async ({ page, game }) => {
    await game(`G.Q = []; toTier(5, 3); await sleep(1500);`);
    const a = await game(TRACE_HASH);
    await page.waitForTimeout(1500);
    expect(await game(TRACE_HASH)).toBe(a);
  });
});
