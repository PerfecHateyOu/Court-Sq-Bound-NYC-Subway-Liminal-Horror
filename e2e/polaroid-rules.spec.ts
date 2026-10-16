import { test, expect } from './game';

// A stand-in anomaly with no 3D object: any shot inside the car frames it (same rule as the
// real lighting/ambient anomalies). `at` is when it appeared.
const FAKE = (at: string) => `{ id: 'testanom', desc: 'The test sign changed', tids: ['testsign'], obj: null, at: ${at}, trigger: 0, tier: 0, apply() {}, revert() {} }`;
// Keep both parents looking away (no one watching).
const LOOK_AWAY = `G.carBuilder.parents.forEach((p) => { p.force = false; p.mode = 'phone'; p.until = G.GT + 1e6; p.holdUntil = 0; });
  for (let i = 0; i < 80 && G.carBuilder.parents.some((p) => p.facing); i++) await sleep(50);`;

test.describe('Polaroid follows the rules', () => {
  test('a shot of an anomaly gives no hint, no sanity change and no caption during the ride', async ({ page, game }) => {
    const r = await game(`ride(0); await sleep(300); ${LOOK_AWAY}
      G.active.push(${FAKE('G.GT')}); const san = G.san; const hint = G.hintText;
      const realRandom = Math.random; Math.random = () => 0.99; // no glance
      const photo = G.takePolaroidPhoto(); Math.random = realRandom;
      await sleep(200);
      return { sanDelta: G.san - san, hintChanged: G.hintText !== hint, developed: photo.developed, has: photo.hasAnomalyInFrustum,
        name: photo.anomalyName ?? null, desc: photo.description ?? null, framed: photo.framed.map((f) => f.id), sus: G.sus };`);
    expect(r).toEqual({ sanDelta: 0, hintChanged: false, developed: false, has: false, name: null, desc: null, framed: ['testanom'], sus: 0 });

    // The album shows an undeveloped frame and no verdict.
    await game(`window.__P.setAlbum(true); await sleep(400);`);
    const album = page.locator('text=Polaroid Evidence Album').locator('xpath=ancestor::div[contains(@class,"max-w-4xl")]');
    await expect(album).toContainText('they develop after the ride');
    await expect(album).toContainText('DEVELOPING');
    await expect(album).not.toContainText(/ANOMALY|BASELINE|Anomalies Only|anomalies documented/);
  });

  test('a photo counts as a catch at the next stop, the same as a flag, and develops after the ride', async ({ page, game }) => {
    const r = await game(`ride(0); await sleep(300); ${LOOK_AWAY}
      // A shot taken before the anomaly appeared doesn't count; one after does.
      const realRandom = Math.random; Math.random = () => 0.99;
      const early = G.takePolaroidPhoto(); G.active.push(${FAKE('G.GT + 0.5')}); advance(0.6);
      const late = G.takePolaroidPhoto(); Math.random = realRandom;
      const correct0 = G.acc.correct; G.arrive();
      const rec = G.stopLog[G.stopLog.length - 1].anoms.find((a) => a.id === 'testanom');
      return { rec, correctDelta: G.acc.correct - correct0, earlyCaught: early.caught.length, lateCaught: late.caught, developedYet: late.developed };`);
    expect(r.rec).toEqual({ id: 'testanom', desc: 'The test sign changed', hit: true, via: 'photo' });
    expect(r.correctDelta).toBe(1);
    expect(r.earlyCaught).toBe(0);
    expect(r.lateCaught).toEqual(['The test sign changed']);
    expect(r.developedYet).toBe(false); // still private until the ride ends

    const dev = await game(`G.endGame(); await sleep(400); const P = window.__P;
      return P.photos.map((p) => ({ developed: p.developed, has: p.hasAnomalyInFrustum, desc: p.description }));`);
    expect(dev).toEqual([
      { developed: true, has: true, desc: 'Caught: The test sign changed' },
      { developed: true, has: false, desc: 'Nothing out of place.' },
    ]);
    const report = page.locator('[aria-labelledby="polaroid-evidence-h"]');
    await expect(report).toContainText('1 caught on film');
    await expect(report).toContainText('CAUGHT');
    await expect(page.getByText('Caught on film:').first()).toBeVisible();
  });

  test('the flash raises Suspicion only if a parent is watching; otherwise it may make one look', async ({ game }) => {
    const watched = await game(`ride(0); await sleep(300);
      const mom = G.carBuilder.parents[0]; mom.force = true;
      for (let i = 0; i < 80 && !mom.facing; i++) await sleep(50);
      const facing = mom.facing; const sus0 = G.sus; G.takePolaroidPhoto(); mom.force = false;
      return { facing, susDelta: G.sus - sus0, reason: G.susLog[G.susLog.length - 1]?.reason };`);
    expect(watched.facing).toBe(true);
    expect(watched.susDelta).toBe(10);
    expect(watched.reason).toMatch(/flash photo while .* was watching/);

    const unwatched = await game(`${LOOK_AWAY} const sus0 = G.sus;
      const realRandom = Math.random; Math.random = () => 0.1; // the flash catches an eye
      G.takePolaroidPhoto(); Math.random = realRandom;
      return { susDelta: G.sus - sus0, looking: G.carBuilder.parents.filter((p) => p.mode === 'player').length };`);
    expect(unwatched.susDelta).toBe(0);
    expect(unwatched.looking).toBe(1);
  });
});
