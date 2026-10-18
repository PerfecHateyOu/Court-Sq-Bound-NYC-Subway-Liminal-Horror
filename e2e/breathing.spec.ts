import { test, expect } from './game';

// Samples the engine's FOV offset over game time without waiting for frames.
const SAMPLE = `const sample = (s) => { const o = []; for (let t = 0; t < s; t += 0.05) { advance(0.05); o.push(G.breathFovOffset()); }
  return { min: Math.min(...o), max: Math.max(...o) }; };`;

test.describe('anxious breathing', () => {
  test('none at High; deeper and faster as sanity drops; flags deepen it', async ({ game }) => {
    const r = await game(`${SAMPLE} const out = {};
      ride(0); toTier(100, 0); advance(4); out.high = sample(3);
      for (const [san, t, k] of [[60, 1, 'med'], [25, 2, 'low'], [5, 3, 'crit']]) {
        ride(0); toTier(san, t); advance(9); out[k] = { ...sample(4), depth: G.breathDepth, bpm: G.breathBpm }; }
      ride(0); toTier(5, 3); G.segFlags.push({ tid: 'x', gt: G.GT }, { tid: 'y', gt: G.GT }); advance(10);
      out.flags2 = G.breathDepth;
      let n = 0, prev = G.breathPhase; for (let t = 0; t < 15; t += 0.05) { advance(0.05); if (G.breathPhase < prev) n++; prev = G.breathPhase; }
      out.perMin = n * 4; return out;`);
    expect(r.high).toEqual({ min: 0, max: 0 });
    expect(r.med.depth).toBeLessThan(r.low.depth);
    expect(r.low.depth).toBeLessThan(r.crit.depth);
    expect(r.med.bpm).toBeLessThan(r.low.bpm);
    expect(r.low.bpm).toBeLessThan(r.crit.bpm);
    expect(r.crit.max).toBeLessThanOrEqual(0); // only ever narrows
    expect(Math.abs(-r.crit.min - r.crit.depth)).toBeLessThan(0.08);
    expect(Math.abs(r.flags2 - (0.9 + 2 * 0.22))).toBeLessThan(0.05);
    expect(r.perMin).toBeGreaterThanOrEqual(24);
    expect(r.perMin).toBeLessThanOrEqual(40);
  });

  test('settles back to rest at a station', async ({ game }) => {
    const r = await game(`ride(0); toTier(5, 3); advance(9); const before = G.breathDepth;
      G.phase = 'stop'; advance(9); return { before, after: G.breathDepth, off: G.breathFovOffset() };`);
    expect(r.before).toBeGreaterThan(0.8);
    expect(r.after).toBeLessThan(0.02);
  });

  test('moves the real camera FOV, and freezes on pause', async ({ game }) => {
    const r = await game(`ride(0); toTier(5, 3); G.segFlags.push({ tid: 'x', gt: G.GT }); advance(9);
      const f = []; for (let i = 0; i < 60; i++) { f.push(R.camera.fov); await sleep(40); }
      key('KeyP'); await sleep(200); const p1 = R.camera.fov; await sleep(800); const p2 = R.camera.fov; key('KeyP');
      return { min: Math.min(...f), max: Math.max(...f), pausedDelta: Math.abs(p2 - p1) };`);
    expect(r.max - r.min).toBeGreaterThan(0.2);
    expect(r.max).toBeLessThanOrEqual(68.0001);
    expect(r.pausedDelta).toBe(0);
  });
});

test.describe('anxious breathing with reduced motion', () => {
  test.use({ contextOptions: { reducedMotion: 'reduce' } });
  test('never moves the camera', async ({ game }) => {
    const r = await game(`ride(0); toTier(5, 3); G.segFlags.push({ tid: 'x', gt: G.GT }); advance(9);
      const f = []; for (let i = 0; i < 50; i++) { f.push(R.camera.fov); await sleep(40); }
      return { depth: G.breathDepth, min: Math.min(...f), max: Math.max(...f) };`);
    expect(r.depth).toBeGreaterThan(1);
    expect(r.min).toBe(68);
    expect(r.max).toBe(68);
  });
});
