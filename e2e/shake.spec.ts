import { test, expect } from './game';

// Samples the 3D view's container over real frames and checks, from its computed transform,
// whether every screen corner is still covered (the container bleeds 8 px past each edge).
const SAMPLE = `const sampleCover = async (ms) => {
  const el = R.renderer.domElement.parentElement; const W = innerWidth, H = innerHeight;
  let worst = -1e9, maxZoom = 1, maxShift = 0, frames = 0, shaking = 0; const t0 = performance.now();
  while (performance.now() - t0 < ms) {
    G.paText = ''; G.subHtml = '';
    const tf = getComputedStyle(el).transform; frames++;
    if (tf && tf !== 'none') { shaking++;
      const m = new DOMMatrix(tf); const inv = m.inverse(); const hw = el.offsetWidth / 2, hh = el.offsetHeight / 2;
      maxZoom = Math.max(maxZoom, Math.hypot(m.a, m.b)); maxShift = Math.max(maxShift, Math.abs(m.e), Math.abs(m.f));
      for (const [x, y] of [[-W / 2, -H / 2], [W / 2, -H / 2], [-W / 2, H / 2], [W / 2, H / 2]]) {
        const p = inv.transformPoint(new DOMPoint(x, y)); worst = Math.max(worst, Math.abs(p.x) - hw, Math.abs(p.y) - hh); } }
    await new Promise((r) => requestAnimationFrame(r)); }
  return { uncoveredPx: +Math.max(0, worst).toFixed(2), maxZoom: +maxZoom.toFixed(3), maxShift: +maxShift.toFixed(1), frames, shaking }; };`;
const NEAR_BRAKE = `G.Q = []; G.startSegment(0); G.active.forEach((a) => (a.trigger = 999)); G.paText = ''; G.subHtml = '';
  G.ts = G.segLen(G.seg) - 5.5; G.san = 5; advance(0.05); G.san = 5;`;

test.describe('screen shake', () => {
  test('at Critical sanity, braking, the shaken view still covers every screen corner', async ({ game }) => {
    const r = await game(`${SAMPLE} ${NEAR_BRAKE} await sleep(300); return { tier: G.tier, ...(await sampleCover(6000)) };`);
    expect(r.tier).toBe(3);
    expect(r.shaking).toBeGreaterThanOrEqual(2); // it really is shaking (software WebGL gives few frames)
    expect(r.maxShift).toBeGreaterThan(4);
    expect(r.uncoveredPx).toBe(0);
    expect(r.maxZoom).toBeLessThan(1.1);
  });

  test('every frame of a ride, at every tier and screen size, the cover zoom keeps the corners covered', async ({ game }) => {
    const r = await game(`const cover = window.__shakeCoverScale; const out = {};
      const sizes = [[1920, 1080], [1280, 720], [640, 360], [390, 844]];
      for (const [san, name] of [[100, 'High'], [60, 'Medium'], [25, 'Low'], [5, 'Critical']]) {
        G.Q = []; G.startSegment(0); G.active.forEach((a) => (a.trigger = 999)); G.san = san; advance(0.05);
        let worst = -1e9, maxZoom = 1, maxShift = 0; const zoom = sizes.map(() => 1);
        while (G.phase === 'ride') { G.san = san; advance(0.0166, 0.0166); const k = G.screenShake; if (k.intensity <= 0.001) continue;
          maxShift = Math.max(maxShift, Math.abs(k.x), Math.abs(k.y));
          sizes.forEach(([W, H], i) => {
            // Same rule as App: zoom in at once, ease out slowly.
            const need = cover(W, H, 8, k); zoom[i] = need > zoom[i] ? need : zoom[i] + (need - zoom[i]) * (1 - Math.exp(-0.0166 / 0.6));
            maxZoom = Math.max(maxZoom, zoom[i]);
            // Independent check with DOMMatrix: container (W+16)x(H+16) about its centre.
            const m = new DOMMatrix().translate(k.x, k.y).rotate(k.rot).scale(zoom[i]); const inv = m.inverse();
            for (const [x, y] of [[-W / 2, -H / 2], [W / 2, -H / 2], [-W / 2, H / 2], [W / 2, H / 2]]) {
              const p = inv.transformPoint(new DOMPoint(x, y)); worst = Math.max(worst, Math.abs(p.x) - (W / 2 + 8), Math.abs(p.y) - (H / 2 + 8)); } }); }
        out[name] = { uncoveredPx: +Math.max(0, worst).toFixed(3), maxZoom: +maxZoom.toFixed(3), maxShift: +maxShift.toFixed(1) }; }
      return out;`);
    console.log('   cover zoom by tier:', JSON.stringify(r));
    for (const t of Object.values(r) as any[]) expect(t.uncoveredPx).toBe(0);
    expect(r.Critical.maxShift).toBeGreaterThan(10); // the shake itself is unchanged
    expect(r.Critical.maxZoom).toBeLessThan(1.12);
    expect(r.High.maxZoom).toBeLessThan(1.02);
  });

  test('Reduced: no screen shake, only the gentle bob', async ({ page, game }) => {
    await page.evaluate(() => (window as any).__S.set({ screenEffects: 'reduced' }));
    const r = await game(`${SAMPLE} ${NEAR_BRAKE} let maxShake = 0, maxBob = 0;
      for (let t = 0; t < 4; t += 0.0166) { G.san = 5; advance(0.0166, 0.0166); const k = G.screenShake;
        maxShake = Math.max(maxShake, Math.abs(k.x), Math.abs(k.y), Math.abs(k.rot)); maxBob = Math.max(maxBob, Math.abs(G.camera.position.y - G.eyePos.y)); }
      G.ts = G.segLen(G.seg) - 5.5; const cover = await sampleCover(1200); return { maxShake, bobCm: maxBob * 100, ...cover };`);
    expect(r.maxShake).toBeLessThan(0.01);
    expect(r.shaking).toBe(0); // no CSS transform at all
    expect(r.bobCm).toBeGreaterThan(0.1); // the ride still sways a little
    expect(r.bobCm).toBeLessThan(1);
  });

  test('pausing clears the shake', async ({ page, game }) => {
    await game(`${NEAR_BRAKE} await sleep(500);`);
    await page.keyboard.press('KeyP');
    const tf = await game(`await sleep(200); return getComputedStyle(R.renderer.domElement.parentElement).transform;`);
    expect(tf).toBe('none');
  });
});
