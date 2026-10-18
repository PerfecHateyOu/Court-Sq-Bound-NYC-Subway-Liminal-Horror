import { test, expect, board } from './game';
import { PSYCH_ENTRIES } from '../src/game/psychLog';

const mk = (stop: number, anoms: Array<{ id: string; desc: string; hit: boolean }>) => ({
  stop, b: false, name: 'S' + stop, anoms, fps: [], doors: null,
});
const LOG = '[aria-labelledby="psych-log-h"]';

test.describe('Psychological Log', () => {
  test('has one entry per anomaly in the catalog, with the same class', async ({ game }) => {
    const cat = await game(`return Object.fromEntries(Object.entries(G.anomalyMgr.catalog).map(([k, v]) => [k, v.tier]));`);
    const log = Object.fromEntries(Object.entries(PSYCH_ENTRIES).map(([k, v]) => [k, v.tier]));
    expect(log).toEqual(cat);
  });

  test('scored stops carry anomaly ids, and Stop 10 never repeats one', async ({ game }) => {
    const r = await game(`toTier(5, 3); G.Q = []; G.startSegment(9); G.paText = ''; G.subHtml = '';
      const crit = G.active.find((a) => a.tier >= 3);
      G.active.forEach((a) => (a.trigger = a.tier >= 3 ? G.ts + 0.4 : 999)); G.ty = 1.6; G.tp = 0.5;
      for (let i = 0; i < 200 && crit.at === null; i++) { G.paText = ''; G.subHtml = ''; advance(0.05); }
      G.segFlags.push({ tid: crit.tids[0], gt: G.GT + 0.01 });
      const planned = G.active.filter((a) => a.at !== null).map((a) => a.id); G.arrive();
      const rec = G.stopLog[G.stopLog.length - 1];
      let dup = 0; for (let i = 0; i < 200; i++) { G.Q = []; G.startSegment(9); const ids = G.active.map((a) => a.id);
        if (new Set(ids).size !== ids.length) dup++; G.active.forEach((a) => a.revert()); G.active = []; }
      return { id: crit.id, planned, anoms: rec.anoms, dup };`);
    expect(r.anoms.map((a: any) => a.id)).toEqual(r.planned);
    expect(r.anoms.find((a: any) => a.id === r.id).hit).toBe(true);
    expect(r.dup).toBe(0);
  });

  test('NEW and CONFIRMED badges, counts, and progress that survives a reload', async ({ page, game }) => {
    const ride1 = [
      mk(3, [{ id: 'adswap', desc: 'The KESSLER DENTAL ad had a typo', hit: true }]),
      mk(5, [{ id: 'stare', desc: 'The man across the aisle stared', hit: false }, { id: 'adswap', desc: 'another typo', hit: false }]),
      mk(9, [{ id: 'momface', desc: 'Mom’s face froze', hit: false }]),
    ];
    const r1 = await game(`G.stopLog = ${JSON.stringify(ride1)}; G.endGame(); await sleep(300);
      return { ride: G.psychLog.ride.map((e) => [e.id, e.isNew, e.confirmed]), stored: JSON.parse(localStorage.getItem('gtrain-psychlog')) };`);
    expect(r1.ride).toEqual([['adswap', true, false], ['stare', true, false], ['adswap', false, false], ['momface', true, false]]);
    expect(r1.stored.adswap).toMatchObject({ seen: 2, caught: 1 });
    expect(r1.stored.stare).toMatchObject({ seen: 1, caught: 0 });
    const log = page.locator(LOG);
    await expect(log).toContainText('1 / 13 documented');
    await expect(log.locator('span', { hasText: /^NEW$/ })).toHaveCount(3);
    await expect(log.locator('ul > li')).toHaveCount(13);
    await expect(log.locator('[aria-label="Redacted"]')).toHaveCount(10);

    const run2 = await board(page, { keepStorage: true });
    const ride2 = [
      mk(4, [{ id: 'stare', desc: 'The man across the aisle stared', hit: true }]),
      mk(10, [{ id: 'dadanswer', desc: 'Dad answered an unspoken thought', hit: true }]),
    ];
    const r2 = await run2(`G.stopLog = ${JSON.stringify(ride2)}; G.endGame(); await sleep(300);
      return G.psychLog.ride.map((e) => [e.id, e.isNew, e.confirmed]);`);
    expect(r2).toEqual([['stare', false, true], ['dadanswer', true, false]]);
    await expect(log).toContainText('3 / 13 documented');
    await expect(log).toContainText('CONFIRMED');

    await page.setViewportSize({ width: 375, height: 800 });
    const overflow = await log.evaluate((el) => el.scrollWidth - el.clientWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });

  test('a ride with no anomalies shows the empty line', async ({ page, game }) => {
    await game(`G.stopLog = []; G.endGame(); await sleep(300);`);
    await expect(page.locator(LOG)).toContainText('Nothing happened in front of you');
  });
});
