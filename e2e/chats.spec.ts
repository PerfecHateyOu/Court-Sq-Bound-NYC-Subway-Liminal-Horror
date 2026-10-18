import { test, expect } from './game';
import { CALM_CHATS, CHATS } from '../src/constants';

// Ride into a segment until its arrival choice, collecting every subtitle the parents say.
const HEAR = (seg: number) => `G.Q = []; G.startSegment(${seg}); G.active.forEach((a) => (a.trigger = 999)); G.seg._masks = [];
  const said = []; let last = '';
  for (let i = 0; i < 4000 && !G.choice; i++) { advance(0.05); const t = G.subHtml; if (t && t !== last && !said.includes(t)) said.push(t); last = t; }
  G.choice = null;`;

const lines = (ex: [number, string][]) => ex.map(([, l]) => l);

test.describe('Parents’ small talk', () => {
  test('each ride swaps only the calm exchanges, never reusing an extra', async ({ game }) => {
    const rides = await game<Record<string, [number, string][]>[]>(`const out = [];
      for (let i = 0; i < 60; i++) { G.newGame(); out.push(JSON.parse(JSON.stringify(G.chatSwap))); }
      return out;`);
    const extras = CALM_CHATS.map((ex) => JSON.stringify(ex));
    const seen = new Set<string>();
    for (const swap of rides) {
      expect(Object.keys(swap).every((k) => ['0', '1', '2'].includes(k))).toBe(true);
      const used = Object.values(swap).map((ex) => JSON.stringify(ex));
      expect(new Set(used).size).toBe(used.length);
      for (const u of used) expect(extras).toContain(u), seen.add(u);
    }
    expect(seen.size).toBe(CALM_CHATS.length); // over 60 rides every extra shows up
    expect(rides.some((s) => Object.keys(s).length < 3)).toBe(true); // and the scripted exchanges still play
  });

  test('a swapped exchange is what the parents say, and Low tier still turns it into the Stop 9 line', async ({ game }) => {
    const extra = CALM_CHATS[0];
    const r = await game<{ high: string[]; low: string[] }>(`G.chatSwap = { 0: ${JSON.stringify(extra)} };
      let high, low;
      { ${HEAR(0)} high = said; }
      G.san = 20; advance(0.05);
      { ${HEAR(0)} low = said; }
      return { high, low };`);
    for (const l of lines(extra)) expect(r.high.join(' | ')).toContain(l);
    for (const l of lines(CHATS[0])) expect(r.high.join(' | ')).not.toContain(l);
    for (const l of lines(CHATS[3])) expect(r.low.join(' | ')).toContain(l);
    for (const l of lines(extra)) expect(r.low.join(' | ')).not.toContain(l);
  });

});
