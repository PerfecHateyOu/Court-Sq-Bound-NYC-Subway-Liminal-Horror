import { test, expect } from './game';

// Every point light the renderer draws costs every lit pixel, near or far. See
// SubwayCarBuilder.updateLightPool: the 12 ceiling lights drive a pool of 4 real ones.
const RENDERED_POINT_LIGHTS = `let n = 0; window.__R.scene.traverse((o) => { if (!o.isPointLight) return; let v = o.visible; o.traverseAncestors((a) => { if (!a.visible) v = false; }); if (v) n++; }); return n;`;

test.describe('rendering budget', () => {
  test('at most 6 point lights are rendered during a ride (4 pooled ceiling lights + 2 tunnel lights)', async ({ game }) => {
    const n = await game(`ride(1); await sleep(300); ${RENDERED_POINT_LIGHTS}`);
    expect(n).toBeLessThanOrEqual(6);
  });

  test('the pooled lights follow the ceiling lights nearest the camera, including flicker and dimming', async ({ game }) => {
    const r = await game(`ride(1); G.seg._masks = []; await sleep(300);
      const cb = G.carBuilder; const cam = window.__R.camera.position;
      const pos = (l) => l.getWorldPosition(cam.clone());
      const nearest = [...cb.carLights].sort((a, b) => pos(a).distanceTo(cam) - pos(b).distanceTo(cam)).slice(0, 4).map((l) => pos(l).x.toFixed(2)).sort();
      const pooled = cb.lightPool.map((l) => pos(l).x.toFixed(2)).sort();
      const lit = cb.lightPool.every((l) => l.intensity > 0);
      const frames = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      G.flickerUntil = G.GT + 5; advance(0.1); await frames();
      const off = cb.carLights.every((l) => l.intensity === 0) && cb.lightPool.every((l) => l.intensity === 0);
      G.flickerUntil = 0; advance(0.1); await sleep(300); await frames();
      const back = cb.lightPool.every((l) => Math.abs(l.intensity - cb.carLights[0].intensity) < 1e-6);
      return { nearest, pooled, lit, off, back, virtualRendered: cb.carLights.some((l) => l.visible) };`);
    expect(r.pooled).toEqual(r.nearest);
    expect(r).toMatchObject({ lit: true, off: true, back: true, virtualRendered: false });
  });

  test('walking into the next car hands the pool to that car’s lights', async ({ game }) => {
    const r = await game(`ride(1); G.seg._masks = []; await sleep(200);
      const frames = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      G.eyePos.x = -19.5; advance(0.1); await frames(); await sleep(300); await frames();
      return G.carBuilder.lightPool.map((l) => +l.getWorldPosition(window.__R.camera.position.clone()).x.toFixed(1)).sort((a, b) => a - b);`);
    expect(r).toEqual([-25.5, -21.5, -17.5, -13.5]);
  });

  test('no HUD panel blurs the live 3D view behind it', async ({ game }) => {
    const n = await game(`ride(6); window.__EVP.hasRecorder = true; G.toggleRecorder(); G.startMaskCheck(); await sleep(400);
      return [...document.querySelectorAll('*')].filter((e) => getComputedStyle(e).backdropFilter !== 'none' && e.getClientRects().length).length;`);
    expect(n).toBe(0);
  });
});
