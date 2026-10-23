import { test, expect } from './game';

test.describe('Atmospheric horror & audiovisual polish', () => {
  test('audioEngine synthesizes wheel flange squeals, power sparks, and conductor broadcasts without errors', async ({ game }) => {
    const res = await game(`
      audioEngine.init(false);
      audioEngine.wheelFlangeSqueal(0.5, 0.05);
      audioEngine.thirdRailSpark();
      audioEngine.conductorBroadcast(1);
      return {
        hasSqueal: typeof audioEngine.wheelFlangeSqueal === 'function',
        hasSpark: typeof audioEngine.thirdRailSpark === 'function',
        hasConductor: typeof audioEngine.conductorBroadcast === 'function',
      };
    `);
    expect(res).toEqual({
      hasSqueal: true,
      hasSpark: true,
      hasConductor: true,
    });
  });

  test('power flickers momentarily dip car light intensity and recover', async ({ game }) => {
    const res = await game(`
      ride(1);
      G.Q = [];
      const cb = G.carBuilder;
      const initialDip = cb.powerDip;
      cb.triggerPowerFlicker(0.8, 0.08);
      const dipped = cb.powerDip;
      advance(0.2);
      const recovered = cb.powerDip;
      return { initialDip, dipped, recovered };
    `);
    expect(res.initialDip).toBe(1.0);
    expect(res.dipped).toBeLessThan(0.3);
    expect(res.recovered).toBeGreaterThanOrEqual(0.95);
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
