import { test, expect } from './game';

// The in-transit conductor PA (src/game/gameState.ts planAtmosphere / conductorSlots).
test.describe('Conductor PA', () => {
  test('whether it plays doesn’t depend on the stretch: chat stops (4, 6, 9) get it too', async ({ game }) => {
    const r = await game(`const C = G.constructor; const was = C.CONDUCTOR_CHANCE; C.CONDUCTOR_CHANCE = 1;
      const out = { planned: [], missing: [] };
      for (const nm of [false, true]) { G.nightmare = nm;
        for (let i = 0; i < 13; i++) { G.Q = []; G.startSegment(i); const s = G.seg;
          const trestle = Number.isFinite(G.trestleExitAt) || G.trestleEnterAt !== null;
          if (s.b || s.restraint || s.stop === 13 || trestle) continue;
          if (G.conductorAt === null) out.missing.push((nm ? 'nightmare ' : '') + s.stop); else if (!nm) out.planned.push(s.stop); } }
      G.nightmare = false; C.CONDUCTOR_CHANCE = was; return out;`);
    expect(r.missing).toEqual([]);
    expect(r.planned).toEqual(expect.arrayContaining([2, 4, 6, 9]));
  });

  test('it is planned clear of the next-stop PA, the parents’ chat, mask checks and braking', async ({ game }) => {
    const r = await game(`const C = G.constructor; const was = C.CONDUCTOR_CHANCE; C.CONDUCTOR_CHANCE = 1; const bad = []; let n = 0;
      const D = C.CONDUCTOR_S;
      const clear = (t, a, b) => t + D <= a || t >= b;
      for (let k = 0; k < 20; k++) for (let i = 0; i < 13; i++) { G.Q = []; G.startSegment(i); const s = G.seg; const t = G.conductorAt;
        if (t === null) continue; n++;
        if (!clear(t, 7.0, 11.5)) bad.push('next-stop PA at ' + s.stop + ': ' + t);
        if (s.chat !== undefined && !clear(t, 15.0, 22.0)) bad.push('chat at ' + s.stop + ': ' + t);
        (s._masks || []).forEach((m) => { if (!clear(t, m.t, m.t + 10)) bad.push('mask at ' + s.stop + ': ' + t); });
        if (t + D > 5 + G.cruiseOf(s) - 6) bad.push('braking at ' + s.stop + ': ' + t); }
      C.CONDUCTOR_CHANCE = was; return { bad, n };`);
    expect(r.bad).toEqual([]);
    expect(r.n).toBeGreaterThan(100);
  });

  test('it goes through setPA: subtitled, and the music ducks', async ({ game }) => {
    const r = await game(`ride(1); G.Q = []; G.paText = ''; G.paUntil = 0; G.subHtml = ''; G.intercomUntil = 0;
      G.conductorFree = [[0, 999]]; G.conductorAt = G.ts + 0.1;
      let calls = 0; const o = A.conductorBroadcast.bind(A); A.conductorBroadcast = (v) => { calls++; return o(v); };
      advance(0.2); A.conductorBroadcast = o;
      return { calls, text: G.paText, left: G.paUntil - G.GT, announcing: !!G.paText && G.GT < G.paUntil };`);
    expect(r.calls).toBe(1);
    expect(r.text).toMatch(/stand clear|next stop|dispatcher/);
    expect(r.left).toBeGreaterThan(2);
    expect(r.announcing).toBe(true);
  });

  test('it never talks over “The next stop is…”: it waits for it to finish', async ({ game }) => {
    const r = await game(`ride(1); G.Q = []; G.startSegment(1); G.active.forEach((a) => (a.trigger = 999)); G.seg._masks = [];
      G.conductorFree = [[0, 30]]; G.conductorAt = 7.3;
      let nextFirst = null, nextLast = null, condFirst = null;
      for (let i = 0; i < 400 && G.ts < 20; i++) { advance(0.05);
        if (/^The next stop is/.test(G.paText)) { if (nextFirst === null) nextFirst = G.ts; nextLast = G.ts; }
        else if (G.paText && condFirst === null && nextFirst !== null) condFirst = G.ts; }
      return { nextFirst, shown: nextLast - nextFirst, condFirst, after: condFirst > nextLast };`);
    expect(r.nextFirst).not.toBeNull();
    expect(r.shown).toBeGreaterThan(4.3);
    expect(r.condFirst).not.toBeNull();
    expect(r.after).toBe(true);
  });
});
