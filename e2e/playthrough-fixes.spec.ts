import { test, expect } from './game';

// Part of #39, section 4: found in a scripted full playthrough.

test.describe('Playthrough fixes', () => {
  test('holding Space through the end of the restraint, as it asks, doesn’t turn into a flag', async ({ page, game }) => {
    await game(`ride(10); G.seg._masks = []; G.active.forEach((a) => (a.trigger = 999)); G.ty = 0; G.yaw = 0; G.startRestraintMoment();`);
    await page.keyboard.down('Space'); // "Hold Space. Don't let go."
    const r = await game(`for (let i = 0; i < 2000 && G.restraint; i++) advance(0.05);
      const ok = G.restraintOK;
      advance(2); // still holding Space, looking at the car
      return { ok, flagHeld: G.flagHeld, flags: G.segFlags.length };`);
    await page.keyboard.up('Space');
    expect(r).toEqual({ ok: true, flagHeld: false, flags: 0 });
    // A fresh press of F still flags.
    await page.keyboard.down('KeyF');
    expect(await game(`advance(1); return G.segFlags.length;`)).toBe(1);
    await page.keyboard.up('KeyF');
  });

  test('when Dad answers an unspoken thought, the subtitle and the report quote the same line', async ({ game }) => {
    const r = await game(`ride(12); const out = [];
      for (let i = 0; i < 12; i++) {
        const a = G.anomalyMgr.createAnomaly('dadanswer', 0); G.subHtml = '';
        G.active = [a]; a.trigger = G.ts; advance(0.1);
        out.push({ said: (G.subHtml || '').replace(/<[^>]+>/g, '').replace(/^Dad: /, ''), desc: a.desc });
      }
      return out;`);
    for (const { said, desc } of r) {
      expect(said.length).toBeGreaterThan(0);
      expect(desc).toBe(`Dad answered an unspoken thought aloud: "${said}"`);
    }
  });
});
