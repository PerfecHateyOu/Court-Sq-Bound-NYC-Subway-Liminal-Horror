import { test, expect } from './game';

const SETUP = `if (!window.__peakRms) { const an = A.ac.createAnalyser(); an.fftSize = 2048; A.outGain.connect(an);
    window.__peakRms = async (ms) => { let m = 0; const t0 = performance.now(); while (performance.now() - t0 < ms) {
      const d = new Float32Array(an.fftSize); an.getFloatTimeDomainData(d); let s = 0; for (const v of d) s += v * v;
      m = Math.max(m, Math.sqrt(s / d.length)); await sleep(30); } return m; };
    window.__calls = []; const o = A.intercom.bind(A); A.intercom = (t) => { window.__calls.push(t); return o(t); }; }
  // Quiet also means no conductor PA due (it can land on any stretch: e2e/conductor-pa.spec.ts).
  const quiet = () => { G.paText = ''; G.subHtml = ''; G.conductorAt = null; };`;

test.describe('background intercom', () => {
  test('plays during rides, audibly, then schedules the next one 28–55 s out', async ({ game }) => {
    const r = await game(`${SETUP} ride(0); quiet(); await sleep(200); A.setBedLevel(0.0001, 0.05);
      quiet(); G.intercomT = 0; advance(0.05);
      return { calls: window.__calls.length, rms: await window.__peakRms(2500), next: G.intercomT };`);
    expect(r.calls).toBe(1);
    expect(r.rms).toBeGreaterThan(0.002);
    expect(r.next).toBeGreaterThanOrEqual(28);
    expect(r.next).toBeLessThanOrEqual(62);
  });

  test('waits for quiet moments, holds off near braking, silent at stations', async ({ game }) => {
    const r = await game(`${SETUP} ride(0); quiet(); const busy = {};
      for (const [k, set, clear] of [['pa', () => (G.paText = 'The next stop is Classon Av.'), () => (G.paText = '')],
        ['dialogue', () => (G.subHtml = '<b>Mom:</b> hi'), () => (G.subHtml = '')],
        ['prompt', () => (G.choice = { items: [], window: 4, left: 4, gT: 0, glitch: 0, keyMap: [] }), () => (G.choice = null)]]) {
        window.__calls = []; set(); G.intercomT = 0; advance(0.2); busy[k] = { played: window.__calls.length, retry: G.intercomT }; clear(); }
      window.__calls = []; quiet(); G.ts = G.segLen(G.seg) - 9; G.intercomT = 0; advance(0.2); const brake = window.__calls.length;
      window.__calls = []; G.phase = 'stop'; G.intercomT = 0; G.update(0.05); G.update(0.05); const station = window.__calls.length; G.phase = 'ride';
      return { busy, brake, station };`);
    for (const v of Object.values(r.busy) as any[]) {
      expect(v.played).toBe(0);
      expect(v.retry).toBeGreaterThan(4);
      expect(v.retry).toBeLessThanOrEqual(6);
    }
    expect(r.brake).toBe(0);
    expect(r.station).toBe(0);
  });

  test('uses the current sanity tier, and pausing silences it', async ({ game }) => {
    const r = await game(`${SETUP} ride(0); const tiers = [];
      for (const [san, t] of [[100, 0], [60, 1], [25, 2], [5, 3]]) { toTier(san, t); window.__calls = []; G.ts = 5; quiet(); G.intercomT = 0; advance(0.1);
        tiers.push([window.__calls[0], A.getIntercom().last.tier]); }
      toTier(100, 0); G.ts = 5; quiet(); G.intercomT = 0; await sleep(200); key('KeyP'); await sleep(700);
      const bus = A.masterGain.gain.value; key('KeyP'); return { tiers, bus };`);
    expect(r.tiers).toEqual([[0, 0], [1, 1], [2, 2], [3, 3]]);
    expect(r.bus).toBeLessThan(0.02);
  });
});
