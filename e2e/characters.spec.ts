import { test, expect } from './game';

// The passengers are built from boxes, then their static parts are merged per material
// (src/graphics/characterBuilder.ts mergeStatic), so the car costs far fewer draw calls. The
// parts that move or change keep their own meshes.

test('passengers are merged per material, and the parts anomalies touch still stand alone', async ({ game }) => {
  const r = await game(`
    const cb = G.carBuilder;
    const people = [...cb.parents, ...cb.strangers, ...cb.crowd, cb.extraPerson];
    const count = (o) => { let n = 0; o.traverse((m) => { if (m.isMesh) n++; }); return n; };
    const mom = cb.parents[0];
    const skinMeshes = []; mom.g.traverse((m) => { if (m.isMesh && m.material === mom.skMat) skinMeshes.push(m); });
    return {
      most: Math.max(...people.map((p) => count(p.g))),
      pupils: mom.eyes.length,
      pupilsInHead: mom.eyes.every((e) => e.parent === mom.head),
      phoneOwn: !!mom.phone && mom.phone.parent === mom.g,
      skinShared: people.filter((p) => p !== mom).some((p) => p.skMat === mom.skMat),
      skinMeshes: skinMeshes.length,
      tagged: (() => { let ok = true; mom.g.traverse((m) => { if (m.isMesh && m.userData.tid !== 'mom') ok = false; }); return ok; })(),
    };`);
  expect(r.most, 'meshes in the busiest passenger').toBeLessThanOrEqual(24);
  expect(r).toMatchObject({ pupils: 2, pupilsInHead: true, phoneOwn: true, skinShared: false, tagged: true });
  // Skin is one mesh for the body and one for the head, so the pale-skin anomaly still recolours all of it.
  expect(r.skinMeshes).toBeGreaterThanOrEqual(2);
});

test('breathing is slow and tiny, and off under Reduced screen effects', async ({ game }) => {
  const scales = await game(`
    G.Q = []; G.startSegment(2); const p = G.carBuilder.strangers[0]; const out = [];
    for (let i = 0; i < 40; i++) { advance(0.1); out.push(p.g.scale.y); }
    window.__S.set({ screenEffects: 'reduced' }); advance(0.2); out.push(p.g.scale.y);
    return out;`);
  const moving = scales.slice(0, -1);
  expect(Math.max(...moving.map((s: number) => Math.abs(s - 1)))).toBeLessThanOrEqual(0.0041);
  expect(Math.max(...moving) - Math.min(...moving)).toBeGreaterThan(0.001);
  expect(scales[scales.length - 1]).toBe(1);
});
