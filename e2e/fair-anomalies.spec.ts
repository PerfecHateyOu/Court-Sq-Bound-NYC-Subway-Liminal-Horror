import { test, expect } from './game';

// #76: fairer anomalies. Each one leaves time to notice it, and the ones you'd have to read or
// spot small happen within reach of your seat. Flags stay private: nothing here tells you
// whether a flag was right.

test.describe('Fairer anomalies', () => {
  test('every anomaly leaves at least 15 s before the doors (short stretches: all they can spare, never under 10)', async ({ game }) => {
    const r = await game(`const out = [];
      for (let i = 0; i < 13; i++) { G.Q = []; G.startSegment(i); const s = G.seg; const L = G.segLen(s); const last = G.lastChanceOf(s);
        let latestTrigger = 0; for (let k = 0; k < 40; k++) { G.Q = []; G.startSegment(i); G.active.forEach((a) => (latestTrigger = Math.max(latestTrigger, a.trigger))); G.active.forEach((a) => a.revert()); }
        out.push({ stop: s.stop + (s.b ? 'b' : ''), L, notice: L - last, slack: last - latestTrigger }); }
      return out;`);
    for (const s of r) {
      expect(s.notice, `stop ${s.stop}`).toBeGreaterThanOrEqual(10);
      if (s.L - 12 >= 15) expect(s.notice, `stop ${s.stop}`).toBeGreaterThanOrEqual(15);
      // Planned early enough to appear before the cutoff (it waits for you to look away).
      expect(s.slack, `stop ${s.stop}`).toBeGreaterThanOrEqual(4 - 1e-9);
    }
  });

  test('it waits while you look at it, appears when you look away before the cutoff, and never after', async ({ game }) => {
    const r = await game(`const run = (lookAwayAt) => { G.Q = []; G.startSegment(2); G.seg._masks = []; G.active.forEach((x) => x.revert());
        const a = G.anomalyMgr.createAnomaly('lighttemp', 6); G.active = [a];
        const aim = (away) => { const d = a.obj.getWorldPosition(G.eyePos.clone()).sub(G.eyePos); const y = Math.atan2(-d.x, -d.z) + (away ? Math.PI : 0);
          G.ty = G.yaw = y; G.tp = G.pitch = away ? 0 : Math.atan2(d.y, Math.hypot(d.x, d.z)); };
        let waited = true;
        while (G.ts < G.segLen(G.seg) - 0.5) { const away = G.ts >= lookAwayAt; aim(away); advance(0.1); if (!away && a.at !== null) waited = false; if (a.at !== null) break; }
        const out = { waited, appeared: a.at !== null, ts: G.ts, last: G.lastChanceOf(G.seg) }; a.revert(); return out; };
      G.Q = []; G.startSegment(2); const last = G.lastChanceOf(G.seg);
      return { before: run(last - 2), after: run(last + 1) };`);
    expect(r.before).toMatchObject({ waited: true, appeared: true });
    expect(r.before.ts).toBeLessThanOrEqual(r.before.last + 0.11);
    expect(r.after).toMatchObject({ waited: true, appeared: false });
  });

  test('typos, warped words, stickers and the cold light happen within reach of your seat', async ({ game }) => {
    const r = await game(`const far = {}; const seen = {};
      for (const id of ['adswap', 'nearword', 'sticker', 'lighttemp']) { far[id] = 0; seen[id] = new Set();
        for (let i = 0; i < 120; i++) { const a = G.anomalyMgr.createAnomaly(id, 0); if (!a) continue;
          const p = a.obj.getWorldPosition(G.eyePos.clone()); seen[id].add(Math.round(p.x)); if (Math.abs(p.x) > 5.5) far[id]++; } }
      return { far, variety: Object.fromEntries(Object.entries(seen).map(([k, v]) => [k, v.size])) };`);
    expect(r.far).toEqual({ adswap: 0, nearword: 0, sticker: 0, lighttemp: 0 });
    for (const [id, n] of Object.entries(r.variety)) expect(n, id).toBeGreaterThanOrEqual(3); // still a choice of spots
  });
});
