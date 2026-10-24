import { test, expect } from './game';

test.describe('Atmospheric horror & audiovisual polish', () => {
  test('audioEngine synthesizes wheel flange squeals, power sparks, and conductor broadcasts without errors', async ({ game }) => {
    // The page exposes the audio engine as A (e2e/game.ts), not as a global audioEngine.
    const res = await game(`
      A.init(false);
      A.wheelFlangeSqueal(0.5, 0.05);
      A.thirdRailSpark();
      A.conductorBroadcast(1);
      return {
        hasSqueal: typeof A.wheelFlangeSqueal === 'function',
        hasSpark: typeof A.thirdRailSpark === 'function',
        hasConductor: typeof A.conductorBroadcast === 'function',
      };
    `);
    expect(res).toEqual({
      hasSqueal: true,
      hasSpark: true,
      hasConductor: true,
    });
  });

  test('a third-rail gap flickers one ceiling tube only, never the whole car, and it comes back', async ({ game }) => {
    const res = await game(`
      ride(1);
      G.Q = [];
      const cb = G.carBuilder;
      const lit = () => cb.lightSegs.filter((l) => l.m.visible).length;
      const total = cb.lightSegs.length;
      const before = lit();
      const pools = cb.lightPool.map((p) => p.intensity);
      const i = G.flickerOneTube();
      advance(0.05);
      const during = lit();
      const tubeOut = !cb.lightSegs[i].m.visible;
      const wholeCar = G.GT < G.flickerUntil;
      advance(0.3);
      return { total, before, during, tubeOut, wholeCar, after: lit(), oldApi: 'powerDip' in cb || 'triggerPowerFlicker' in cb };
    `);
    expect(res.before).toBe(res.total);
    expect(res.during).toBe(res.total - 1);
    expect(res.tubeOut).toBe(true);
    expect(res.wholeCar).toBe(false);
    expect(res.after).toBe(res.total);
    expect(res.oldApi).toBe(false);
  });

  test('the tube flicker runs on game time: pausing holds it', async ({ game }) => {
    const res = await game(`
      ride(1);
      G.Q = [];
      G.pause();
      G.flickerOneTube();
      const until = G.tubeFlicker.until;
      await sleep(400);
      return { held: G.tubeFlicker !== null && G.GT < until };
    `);
    expect(res.held).toBe(true);
  });

  test('the tube flicker is planned mid-cruise only: done 10 s before braking, never on the trestle, 6b, the restraint, or the last stretch', async ({ game }) => {
    const r = await game(`const out = { planned: 0, bad: [] }; const C = G.constructor; const was = C.TUBE_FLICKER_CHANCE; C.TUBE_FLICKER_CHANCE = 1;
      for (let i = 0; i < 13; i++) { G.Q = []; G.startSegment(i); const s = G.seg;
        const trestle = Number.isFinite(G.trestleExitAt) || G.trestleEnterAt !== null;
        const skip = s.b || s.restraint || s.stop === 13 || trestle;
        if (G.tubeFlickerAt === null) { if (!skip && G.cruiseOf(s) > 13.2) out.bad.push('none at ' + s.stop); continue; }
        out.planned++;
        if (skip) out.bad.push('planned at ' + s.stop + (s.b ? 'b' : ''));
        const done = G.tubeFlickerAt + C.TUBE_FLICKER_S;
        if (G.tubeFlickerAt < 8 || done > 5 + G.cruiseOf(s) - 10 + 1e-6) out.bad.push('late at ' + s.stop); }
      C.TUBE_FLICKER_CHANCE = was; return out;`);
    expect(r.bad).toEqual([]);
    expect(r.planned).toBeGreaterThan(5);
  });

  test('Reduced screen effects skips the tube flicker entirely, even one already planned', async ({ page, game }) => {
    await page.evaluate(() => (window as any).__S.set({ screenEffects: 'reduced' }));
    const r = await game(`const C = G.constructor; C.TUBE_FLICKER_CHANCE = 1;
      G.Q = []; G.startSegment(1); const planned = G.tubeFlickerAt;
      G.tubeFlickerAt = G.ts + 0.1; advance(0.2);
      C.TUBE_FLICKER_CHANCE = 0.5;
      return { planned, flickered: G.tubeFlicker !== null, out: G.carBuilder.lightSegs.filter((l) => !l.m.visible).length };`);
    expect(r).toEqual({ planned: null, flickered: false, out: 0 });
  });

  test('station platforms feature shadow silhouettes that are completely isolated from anomaly targets', async ({ game }) => {
    const res = await game(`
      ride(1);
      const cb = G.carBuilder;
      let silhouetteCount = 0;
      cb.stA.g.traverse((obj) => {
        if (obj.userData.platformSilhouette) silhouetteCount++;
      });
      const targets = cb.getActiveTargets();
      const silhouetteInTargets = targets.some((m) => m.userData.platformSilhouette || m.parent?.userData.platformSilhouette);
      return { silhouetteCount, silhouetteInTargets };
    `);
    expect(res.silhouetteCount).toBe(4);
    expect(res.silhouetteInTargets).toBe(false);
  });

  test('tunnel contains trackside signal lantern fixtures along tunnel items', async ({ game }) => {
    const res = await game(`
      ride(1);
      const cb = G.carBuilder;
      const signalItems = cb.tunnelItems.filter((it) => it.m.children.length > 0);
      return { signalCount: signalItems.length };
    `);
    expect(res.signalCount).toBeGreaterThanOrEqual(6);
  });

  test('deceleration triggers braking squeal once per approach', async ({ game }) => {
    const res = await game(`
      ride(1);
      G.Q = [];
      G.seg._masks = [];
      const L = G.segLen(G.seg);
      // Fast forward to near braking point
      G.ts = L - 4;
      advance(1.2);
      const squealed = G.squealedThisBrake;
      return { squealed };
    `);
    expect(res.squealed).toBe(true);
  });
});
