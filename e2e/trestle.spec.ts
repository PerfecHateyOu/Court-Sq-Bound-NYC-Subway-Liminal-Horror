import { test, expect } from './game';

// Ride a whole segment by stepping the game clock, sampling the trestle state.
const RIDE = (idx: number) => `G.Q = []; G.startSegment(${idx}); G.active.forEach((a) => (a.trigger = 999)); G.san = 5; advance(0.05);
  const samples = []; let guard = 0;
  while (G.phase === 'ride' && guard++ < 2000) { G.choice = null; advance(0.25, 0.05); samples.push(G.trestleOutside); }`;

test.describe('Newtown Creek trestle', () => {
  test('Stops 1-11 never leave the tunnel', async ({ game }) => {
    const r = await game(`const out = [];
      for (let i = 0; i <= 10; i++) { ${RIDE(0).replace('G.startSegment(0)', 'G.startSegment(i)')} out.push(Math.max(...samples)); if (G.trestleShow) out.push('show'); }
      return out;`);
    expect(r.every((v: any) => v === 0)).toBe(true);
  });

  test('the ride to 21 St climbs out of the tunnel and arrives at an open-air platform', async ({ game }) => {
    const r = await game(`${RIDE(11)}
      const firstOut = samples.findIndex((v) => v > 0); const rising = samples.every((v, i) => i === 0 || v >= samples[i - 1] - 1e-9);
      const cb = G.carBuilder; const wallsShown = cb.stB.g.children.filter((m) => m.geometry && m.geometry.parameters && m.geometry.parameters.width === 44 && m.geometry.parameters.height === 3.2).map((m) => m.visible);
      return { start: samples[0], end: samples[samples.length - 1], firstOutFrac: firstOut / samples.length, rising, wallsShown, show: G.trestleShow };`);
    expect(r.start).toBe(0);
    expect(r.end).toBe(1);
    expect(r.rising).toBe(true);
    expect(r.firstOutFrac).toBeGreaterThan(0.1);
    expect(r.firstOutFrac).toBeLessThan(0.5);
    expect(r.wallsShown).toEqual([false]); // 21 St has no tiled back wall
    expect(r.show).toBe(true);
  });

  test('the ride to Court Sq drops back underground before arriving', async ({ game }) => {
    const r = await game(`${RIDE(12)}
      const fog = R.scene.fog; return { start: samples[0], end: samples[samples.length - 1], show: G.trestleShow, fogFar: fog.far, fogHex: fog.color.getHexString(),
        courtSqOpen: G.carBuilder.stB.g.children.some((m) => m.geometry && m.geometry.parameters && m.geometry.parameters.width === 44 && m.geometry.parameters.height === 3.2 && !m.visible) };`);
    expect(r.start).toBe(1);
    expect(r.end).toBe(0);
    expect(r.show).toBe(false);
    expect(r.fogFar).toBe(30); // tunnel fog fully restored
    expect(r.fogHex).toBe(new (await import('three')).Color(0x040504).getHexString());
    expect(r.courtSqOpen).toBe(false);
  });

  test('interior light is unchanged outside, and the 21 St flicker tick still fires', async ({ game }) => {
    const r = await game(`G.Q = []; G.startSegment(11); G.active.forEach((a) => (a.trigger = 999)); G.san = 5; advance(0.1);
      const inside = G.carBuilder.carLights.map((l) => +l.intensity.toFixed(4));
      while (G.trestleOutside < 1) { G.choice = null; advance(0.25, 0.05); }
      const outside = G.carBuilder.carLights.map((l) => +l.intensity.toFixed(4));
      while (G.phase === 'ride') { G.choice = null; advance(0.1, 0.05); }
      return { inside, outside, flickerArmed: G.flickerUntil > G.GT - 2, out: G.trestleOutside };`);
    expect(r.outside).toEqual(r.inside);
    expect(r.out).toBe(1);
    expect(r.flickerArmed).toBe(true);
  });

  test('other routes keep the tunnel', async ({ game }) => {
    const r = await game(`window.__RT.setRoute('L'); ${RIDE(11)} return Math.max(...samples);`);
    expect(r).toBe(0);
  });

  test('rain and beacons animate, and hold still under Reduced; wind follows the open air', async ({ page, game }) => {
    const full = await game(`G.Q = []; G.startSegment(12); G.active.forEach((a) => (a.trigger = 999)); G.san = 5; advance(1);
      const T = G.carBuilder.trestle; const m = T.rainMats[0]; const o0 = m.map.offset.y; const b0 = T.beaconMat.opacity;
      advance(0.7); return { rain: m.map.offset.y - o0, beacon: Math.abs(T.beaconMat.opacity - b0), wind: A.getOpenAirLevel() };`);
    expect(full.rain).toBeGreaterThan(0.3);
    expect(full.beacon).toBeGreaterThan(0.01);
    expect(full.wind).toBeGreaterThan(0.9);
    await page.evaluate(() => (window as any).__S.set({ screenEffects: 'reduced' }));
    const reduced = await game(`const T = G.carBuilder.trestle; const m = T.rainMats[0]; const o0 = m.map.offset.y;
      advance(0.7); const b1 = T.beaconMat.opacity; advance(0.6); return { rain: m.map.offset.y - o0, beacon: Math.abs(T.beaconMat.opacity - b1) };`);
    expect(reduced).toEqual({ rain: 0, beacon: 0 });
  });

  test('Restart Ride puts the tunnel back', async ({ page, game }) => {
    await game(`G.Q = []; G.startSegment(12); G.san = 5; advance(1);`);
    await page.keyboard.press('KeyP');
    await page.locator('text=/Restart Ride/i').click();
    const r = await game(`await sleep(500); return { exit: String(G.trestleExitAt), enter: G.trestleEnterAt, show: G.trestleShow, out: G.trestleOutside,
      visible: G.carBuilder.trestle.group.visible, wallX: G.carBuilder.tunnelWalls[0].position.x, fogFar: R.scene.fog.far };`);
    expect(r).toEqual({ exit: 'Infinity', enter: null, show: false, out: 0, visible: false, wallX: 0, fogFar: 30 });
  });

  test('performance budget: at most +25 draw calls and +8k triangles; render time logged', async ({ game }) => {
    const r = await game(`const gl = R.renderer.getContext();
      const measure = () => { R.renderer.render(R.scene, R.camera); gl.finish(); const calls = R.renderer.info.render.calls; const tris = R.renderer.info.render.triangles;
        const t0 = performance.now(); for (let i = 0; i < 12; i++) { R.renderer.render(R.scene, R.camera); gl.finish(); } return { calls, tris, ms: (performance.now() - t0) / 12 }; };
      key('KeyP'); await sleep(300); // freeze the game so only our renders run
      G.Q = []; G.startSegment(11); G.ts = 4; G.ty = 0.1; G.tp = 0.05; G.yaw = G.ty; G.pitch = G.tp; G.update(0.016);
      const best = () => [measure(), measure(), measure(), measure(), measure()].sort((a, b) => a.ms - b.ms)[0];
      const tunnel = best();
      while (G.trestleOutside < 1) G.update(0.05); G.ty = 0.1; G.tp = 0.05; G.yaw = G.ty; G.pitch = G.tp; G.update(0.016);
      const open = best();
      key('KeyP'); return { tunnel, open };`);
    console.log('   perf', JSON.stringify(r));
    // Deterministic budget: what we add to each frame.
    expect(r.open.calls - r.tunnel.calls).toBeLessThanOrEqual(25);
    expect(r.open.tris - r.tunnel.tris).toBeLessThanOrEqual(8000);
    // Wall-clock time on a shared software renderer swings a lot (0.5x to 1.4x between runs of
    // the same build), so it's logged, and only a gross regression fails the test.
    expect(r.open.ms / r.tunnel.ms).toBeLessThanOrEqual(2);
  });
});
