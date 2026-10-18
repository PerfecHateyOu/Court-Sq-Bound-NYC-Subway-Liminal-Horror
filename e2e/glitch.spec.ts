import { test, expect, board } from './game';

test.describe('screen glitch', () => {
  test('zero-strength pass matches the direct render', async ({ game }) => {
    const diff = await game<number>(`
      ride(0); await sleep(1200); key('KeyP'); await sleep(300);
      const { renderer, scene, camera, glitchPass } = R; const cv = renderer.domElement;
      const grab = async () => { const im = new Image(); im.src = cv.toDataURL(); await im.decode();
        const c = document.createElement('canvas'); c.width = cv.width; c.height = cv.height;
        const x = c.getContext('2d'); x.drawImage(im, 0, 0); return x.getImageData(0, 0, c.width, c.height).data; };
      renderer.render(scene, camera); const a = await grab();
      glitchPass.render(scene, camera, 0, 0, 1); const b = await grab();
      key('KeyP'); let s = 0; for (let i = 0; i < a.length; i += 4) s += Math.abs(a[i] - b[i]) + Math.abs(a[i+1] - b[i+1]) + Math.abs(a[i+2] - b[i+2]);
      return s / (a.length / 4) / 3;`);
    expect(diff).toBeLessThan(2); // average levels out of 255
  });

  test('none at High or Medium sanity; Low and Critical can glitch', async ({ game }) => {
    const r = await game(`const out = {};
      for (const [san, t] of [[100, 0], [60, 1], [25, 2], [5, 3]]) { toTier(san, t); G.glitch = null; G.triggerGlitch('decoy'); out[t] = !!G.glitch; }
      G.glitch = null; return out;`);
    expect(r).toEqual({ 0: false, 1: false, 2: true, 3: true });
  });

  test('real and decoy glitches are the same size', async ({ game }) => {
    const s = await game(`toTier(5, 3); const s = { anomaly: [], decoy: [] };
      for (const r of ['anomaly', 'decoy']) for (let i = 0; i < 300; i++) { G.glitch = null; G.triggerGlitch(r); s[r].push([G.glitch.strength, G.glitch.duration]); }
      const st = (a) => ({ sMin: Math.min(...a.map((x) => x[0])), sMax: Math.max(...a.map((x) => x[0])),
        sMean: a.reduce((q, x) => q + x[0], 0) / a.length, dMean: a.reduce((q, x) => q + x[1], 0) / a.length });
      G.glitch = null; G.glitchLog = []; return { a: st(s.anomaly), d: st(s.decoy) };`);
    expect(Math.abs(s.a.sMean - s.d.sMean)).toBeLessThan(0.04);
    expect(Math.abs(s.a.dMean - s.d.dMean)).toBeLessThan(0.02);
    expect(s.a.sMax).toBeLessThanOrEqual(1);
    expect(s.d.sMin).toBeGreaterThanOrEqual(0.6);
  });

  test('a Critical anomaly appearing tears the screen at that moment', async ({ game }) => {
    const r = await game(`toTier(5, 3); G.Q = []; G.glitch = null; G.glitchLog = []; G.glitchDecoyT = 999;
      G.startSegment(9); G.paText = ''; G.subHtml = '';
      const crit = G.active.find((a) => a.tier >= 3);
      G.active.forEach((a) => (a.trigger = a.tier >= 3 ? G.ts + 0.4 : 999)); G.ty = 1.6; G.tp = 0.5;
      for (let i = 0; i < 200 && crit.at === null; i++) { G.paText = ''; G.subHtml = ''; advance(0.05); }
      return { appeared: crit.at !== null, log: G.glitchLog.map((l) => ({ reason: l.reason, dt: l.gt - (crit.at ?? 0) })) };`);
    expect(r.appeared).toBe(true);
    expect(r.log).toHaveLength(1);
    expect(r.log[0].reason).toBe('anomaly');
    expect(Math.abs(r.log[0].dt)).toBeLessThan(0.01);
  });

  test('decoys fire at Critical (never at High), 25–55 s apart', async ({ game }) => {
    const r = await game(`ride(0); G.glitch = null; G.glitchLog = [];
      toTier(100, 0); G.glitchDecoyT = 0.5; advance(3); const high = G.glitchLog.length;
      toTier(5, 3); G.glitchDecoyT = 0.5; advance(3);
      return { high, critical: G.glitchLog.filter((l) => l.reason === 'decoy').length, next: G.glitchDecoyT };`);
    expect(r.high).toBe(0);
    expect(r.critical).toBe(1);
    expect(r.next).toBeGreaterThan(20);
    expect(r.next).toBeLessThanOrEqual(55);
  });

  test('the shader pass only runs while a glitch plays, and not while paused', async ({ game }) => {
    const r = await game(`ride(0); const gp = R.glitchPass; let n = 0; const o = gp.render.bind(gp);
      gp.render = (...a) => { n++; o(...a); }; G.glitch = null; await sleep(500); const idle = n;
      toTier(5, 3); G.triggerGlitch('decoy'); await waitGT(G.glitch.duration); const during = n - idle;
      await sleep(700); const after = n - idle - during;
      G.triggerGlitch('decoy'); await sleep(60); key('KeyP'); await sleep(200); const paused = G.glitchAmount(); key('KeyP');
      gp.render = o; return { idle, during, after, paused };`);
    expect(r.idle).toBe(0);
    expect(r.during).toBeGreaterThan(0);
    expect(r.after).toBeLessThanOrEqual(1);
    expect(r.paused).toBe(0);
  });
});

test.describe('screen glitch with reduced motion', () => {
  test.use({ contextOptions: { reducedMotion: 'reduce' } });
  test('is triggered but never drawn', async ({ game }) => {
    const r = await game(`ride(0); toTier(5, 3); const gp = R.glitchPass; let n = 0; const o = gp.render.bind(gp);
      gp.render = (...a) => { n++; o(...a); }; G.glitchLog = []; G.triggerGlitch('anomaly'); await sleep(900);
      return { calls: n, triggered: G.glitchLog.length };`);
    expect(r).toEqual({ calls: 0, triggered: 1 });
  });
});
