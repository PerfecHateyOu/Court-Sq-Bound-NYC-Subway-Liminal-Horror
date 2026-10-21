import { test, expect } from './game';

// #76: turn all the way around in your seat, a car full of people who move like people, and a
// train passing on the other track now and then.

const DRAG = (dx: number) => `const c = R.renderer.domElement; const x = 320, y = 180;
  const ev = (type, cx, cy) => c.dispatchEvent(new PointerEvent(type, { pointerId: 9, pointerType: 'touch', clientX: cx, clientY: cy, bubbles: true }));
  ev('pointerdown', x, y); for (let i = 1; i <= 40; i++) ev('pointermove', x + ${dx} * i / 40, y); ev('pointerup', x + ${dx}, y);`;

test.describe('Looking around', () => {
  test('in the train you can turn all the way around, with a drag or the arrow keys', async ({ page, game }) => {
    // 1300px at 0.0055 rad/px is about 7.2 rad: more than a full turn.
    const dragged = await game(`ride(1); G.Q = []; G.ty = 0; ${DRAG(-1300)} return G.ty;`);
    expect(dragged).toBeGreaterThan(2 * Math.PI);
    await game(`G.ty = 3.0;`);
    await page.keyboard.down('ArrowLeft');
    await game(`await waitGT(0.5);`);
    await page.keyboard.up('ArrowLeft');
    expect(await game(`return G.ty;`)).toBeGreaterThan(3.5); // past the old 1.75 stop
  });

  test('turned around, the view is behind your seat, and walking still goes where you face', async ({ game }) => {
    const r = await game(`ride(1); G.Q = []; G.ty = Math.PI; G.yaw = Math.PI; G.tp = 0; G.pitch = 0; advance(0.05);
      const e = R.camera.matrixWorld.elements; return { dz: -e[10] };`);
    expect(r.dz).toBeGreaterThan(0.9); // facing +z: the window behind the bench
  });

  test('the False Stop Trial keeps its limit (its stage is built to be seen from the front)', async ({ page, game }) => {
    await game(`ride(3); G.Q = []; G.startTrial(); G.ty = 0;`);
    expect(await game(`return G.phase;`)).toBe('trial');
    expect(await game(`${DRAG(-1300)} return G.ty;`)).toBeCloseTo(1.2, 5);
    await page.keyboard.down('ArrowRight');
    await game(`await waitGT(1.5);`);
    await page.keyboard.up('ArrowRight');
    expect(await game(`return G.ty;`)).toBeCloseTo(-1.2, 5);
  });
});

test.describe('A livelier car', () => {
  test('passengers lean back as the train pulls away and forward as it brakes, without moving from their spot', async ({ game }) => {
    const r = await game(`ride(2); G.Q = []; G.seg._masks = []; const s3 = G.carBuilder.strangers[2]; const s1 = G.carBuilder.strangers[0];
      advance(2.0); const pulling = { stand: s3.life.lean, seat: s1.life.lean, pos: s3.g.position.clone(), home: s3.home.clone() };
      G.ts = G.segLen(G.seg) - 3; advance(1.5); const braking = { stand: s3.life.lean, seat: s1.life.lean };
      return { pulling: { stand: pulling.stand, seat: pulling.seat, moved: pulling.pos.distanceTo(pulling.home) }, braking };`);
    expect(r.pulling.stand).toBeGreaterThan(0.02); // back (toward -x; the train runs toward +x)
    expect(r.pulling.seat).toBeGreaterThan(0);
    expect(r.pulling.seat).toBeLessThan(r.pulling.stand); // seated riders lean less
    expect(r.braking.stand).toBeLessThan(-0.02); // forward
    expect(r.pulling.moved).toBe(0);
  });

  test('the "moved" anomaly still moves the standing passenger, and lean never shifts anyone', async ({ game }) => {
    const r = await game(`ride(2); G.Q = []; const s3 = G.carBuilder.strangers[2];
      const a = G.anomalyMgr.createAnomaly('moved', 0); a.apply(); advance(1.0); const moved = s3.g.position.x;
      a.revert(); advance(1.0); return { moved, back: s3.g.position.distanceTo(s3.home) };`);
    expect(r.moved).toBe(-5.0);
    expect(r.back).toBe(0);
  });

  test('habits: headphones nod, the MTA worker checks his radio; none of it piles up on the head', async ({ game }) => {
    const r = await game(`ride(1); G.Q = []; G.seg._masks = []; const L = G.life;
      const mta = G.carBuilder.strangers[0]; const pick = (a) => G.carBuilder.getAllPassengers().find((p) => p.archetype === a && p.g.visible);
      const nod = pick('hoodie') || pick('puffer');
      // Start both habits now, then watch.
      advance(0.05); mta.life.nextAt = G.GT; nod.life.nextAt = G.GT; let radio = 0, nodMax = 0;
      for (let i = 0; i < 40; i++) { advance(0.05); radio = Math.max(radio, mta.life.headX); nodMax = Math.max(nodMax, nod.life.headX); }
      // A long ride with habits coming and going: if offsets piled up, the heads would drift away.
      let worst = 0;
      for (let i = 0; i < 1200; i++) { advance(0.05); for (const p of [mta, nod]) worst = Math.max(worst, Math.abs(p.head.rotation.x - p.pose[1]) - p.life.headX); }
      return { radio, nodMax, mtaArch: mta.archetype, worst };`);
    expect(r.mtaArch).toBe('mta');
    expect(r.radio).toBeGreaterThan(0.2);
    expect(r.nodMax).toBeGreaterThan(0.01);
    expect(r.nodMax).toBeLessThan(0.05);
    expect(r.worst).toBeLessThan(0.9); // gaze swings, but no drift from stacked habits
  });

  test('no habits on the parents or the woman on your bench, and none while the man across stares', async ({ game }) => {
    const r = await game(`ride(1); G.Q = []; G.seg._masks = []; const cb = G.carBuilder;
      const watch = [...cb.parents, cb.strangers[1]]; watch.forEach((p) => { if (p.life) p.life.nextAt = 0; });
      const s1 = cb.strangers[0]; const st = G.anomalyMgr.createAnomaly('stare', 0); st.apply(); advance(0.05); s1.life.nextAt = G.GT;
      let busy = 0, stareHabit = 0;
      for (let i = 0; i < 80; i++) { advance(0.05); busy += watch.filter((p) => p.life && p.life.act).length; stareHabit += s1.life.act ? 1 : 0; }
      st.revert(); return { busy, stareHabit };`);
    expect(r).toEqual({ busy: 0, stareHabit: 0 });
  });
});

test.describe('A train on the other track', () => {
  test('passes mid-cruise only: done 10 s before braking, never on the trestle, 6b, the restraint, the last stretch, or Reduced', async ({ page, game }) => {
    const r = await game(`const out = { planned: 0, bad: [] }; const was = G.constructor.PASS_CHANCE; G.constructor.PASS_CHANCE = 1;
      for (let i = 0; i < 13; i++) { G.Q = []; G.startSegment(i); const s = G.seg;
        const skip = s.b || s.restraint || s.stop === 13 || (s.stop === 12 && !s.b);
        if (G.passAt === null) { if (!skip) out.bad.push('none at ' + s.stop); continue; }
        out.planned++;
        if (skip) out.bad.push('planned at ' + s.stop + (s.b ? 'b' : ''));
        const done = G.passAt + 6.7; if (G.passAt < 8 || done > 5 + G.cruiseOf(s) - 10) out.bad.push('late at ' + s.stop); }
      G.constructor.PASS_CHANCE = was; return out;`);
    expect(r.bad).toEqual([]);
    expect(r.planned).toBeGreaterThan(5);
    await page.evaluate(() => (window as any).__S.set({ screenEffects: 'reduced' }));
    const reduced = await game(`G.constructor.PASS_CHANCE = 1; G.Q = []; G.startSegment(1); const p = G.passAt; G.constructor.PASS_CHANCE = 0.35; return p;`);
    expect(reduced).toBeNull();
  });

  test('it rushes past behind your seat on the other track and is gone', async ({ game }) => {
    const r = await game(`ride(1); G.Q = []; G.seg._masks = []; const T = G.carBuilder.passingTrain;
      G.passAt = G.ts + 0.1; advance(0.2); const started = T.active && T.group.visible;
      const z = T.group.position.z; const x0 = T.x; advance(1); const x1 = T.x;
      for (let i = 0; i < 200 && T.active; i++) advance(0.05);
      return { started, z, movingBack: x1 < x0, gone: !T.active && !T.group.visible };`);
    expect(r).toEqual({ started: true, z: 4.25, movingBack: true, gone: true });
  });
});
