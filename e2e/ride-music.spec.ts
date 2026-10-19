import { test, expect } from './game';

// The ride's music (src/audio/rideMusic.ts): the game's tune over the train's speakers, slowly
// going wrong stop by stop. Stepped in game time, so these check what the music does, not how
// busy the machine is.

const RM = `const RM = A.getRideMusic();`;
// Ride every stretch for most of its length, logging the music's level at each stop.
const RIDE_ALL = `${RM} const level = {};
  for (let i = 0; i < 13; i++) {
    G.Q = []; G.startSegment(i); G.seg._masks = []; G.active.forEach((a) => (a.trigger = 999));
    if (G.seg.restraint) G.restraintDone = true; // past the Greenpoint silence
    const L = G.segLen(G.seg); let peak = 0;
    for (let t = 0; t < L * 0.6; t += 0.1) { advance(0.1); if (!G.seg.final || G.ts < 0.3 * L) peak = Math.max(peak, RM.target); }
    level[G.seg.stop + (G.seg.b ? 'b' : '')] = peak;
  }`;

test.describe('Ride music', () => {
  test('one tune, coming apart in order: comfort, unease, dread, almost nothing; never louder', async ({ game }) => {
    const r = await game(`${RIDE_ALL} return { level, by: RM.stats.byStop };`);
    const by = r.by;
    const stops = ['2', '3', '4', '5', '6', '6b', '7', '8', '9', '10', '11', '12', '13'];
    // Never louder from one stop to the next.
    const levels = stops.map((s) => r.level[s]);
    for (let i = 1; i < levels.length; i++) expect(levels[i], `stop ${stops[i]}`).toBeLessThanOrEqual(levels[i - 1] + 1e-9);
    expect(levels[0]).toBeGreaterThan(0);

    // Stops 2–3: the tune, clean, with brushes and bass.
    for (const s of ['2', '3']) {
      expect(by[s].marked.every((c: number) => c === 0), `stop ${s} in tune`).toBe(true);
      expect(by[s]).toMatchObject({ slipped: 0, dropped: 0, stretched: 0, returns: 0, silentBars: 0 });
      expect(by[s].brush).toBeGreaterThan(0);
      expect(by[s].bass).toBeGreaterThan(0);
    }
    // Stops 4–6: the opening phrase's long note goes flat, more each stop; brushes still there.
    const flat = (s: string) => Math.min(...by[s].marked);
    expect(flat('4')).toBeLessThan(0);
    expect(flat('5')).toBeLessThan(flat('4'));
    expect(flat('6')).toBeLessThan(flat('5'));
    expect(by['6'].brush).toBeGreaterThan(0);
    expect(by['4'].dropped + by['5'].dropped + by['6'].dropped).toBe(0); // nothing missing yet
    // Stops 7–9: no brushes; notes go missing and hang on; the opening phrase comes back at the wrong time.
    const dread = ['7', '8', '9'].map((s) => by[s]);
    for (const s of dread) expect(s.brush).toBe(0);
    expect(dread.reduce((a, s) => a + s.dropped, 0)).toBeGreaterThan(0);
    expect(dread.reduce((a, s) => a + s.stretched, 0)).toBeGreaterThan(0);
    expect(dread.reduce((a, s) => a + s.returns, 0)).toBeGreaterThan(0);
    // Stops 10–13: mostly silence, a few notes.
    for (const s of ['10', '11', '12', '13']) {
      expect(by[s].silentBars, `stop ${s} gaps`).toBeGreaterThan(0);
      expect(by[s].notes / by[s].bars).toBeLessThan(by['2'].notes / by['2'].bars / 3);
    }
  });

  test('pausing freezes it mid-phrase and resuming carries on; the pause menu has the clean tune', async ({ page, game }) => {
    await game(`ride(0); G.Q = []; advance(3);`);
    const before = await game(`${RM} return RM.pos;`);
    await page.keyboard.press('KeyP');
    const paused = await game(`${RM} await sleep(1200); return { pos: RM.pos, out: RM.pauseGain.gain.value, pauseTune: A.getPauseMusic().playing };`);
    expect(paused.pos).toBe(before); // not a beat further, not back to the top
    expect(paused.out).toBeLessThan(0.05);
    expect(paused.pauseTune).toBe(true);
    await page.keyboard.press('KeyP');
    const resumed = await game(`${RM} advance(1); await sleep(1500); return { pos: RM.pos, out: RM.pauseGain.gain.value };`);
    expect(resumed.pos).toBeGreaterThan(before);
    expect(resumed.pos).toBeLessThan(before + 8); // carried on from where it was
    expect(resumed.out).toBeGreaterThan(0.9);
  });

  test('it steps back for the doors, under announcements, and while you listen to the recorder', async ({ game }) => {
    const r = await game(`${RM} ride(1); G.Q = []; G.seg._masks = []; advance(2); // no prompt can interrupt
      const cruising = RM.target;
      G.setPA('The next stop is Classon Av.', 4); advance(0.1); const announcing = RM.target; advance(4.2);
      window.__EVP.hasRecorder = true; G.toggleRecorder(); advance(0.1); const listening = RM.target; G.toggleRecorder(); advance(0.1);
      G.ts = G.segLen(G.seg) - 5; advance(0.1); const approaching = RM.target;
      G.arrive(); advance(0.1); const doors = RM.target;
      return { cruising, announcing, listening, approaching, doors };`);
    expect(r.cruising).toBeGreaterThan(0);
    for (const k of ['announcing', 'listening', 'approaching', 'doors'] as const) expect(r[k], k).toBeLessThan(r.cruising * 0.6);
  });

  test('Greenpoint Av goes silent until the restraint is over, then the tune comes back minor', async ({ game }) => {
    const r = await game(`${RM} G.Q = []; G.startSegment(10); G.seg._masks = []; G.active.forEach((a) => (a.trigger = 999));
      advance(3); const before = RM.target; const minor0 = (RM.stats.byStop[11] || {}).minor || 0;
      G.startRestraintMoment(); G.flagHeld = true; for (let i = 0; i < 2000 && G.restraint; i++) advance(0.05); G.flagHeld = false;
      advance(0.2); const after = RM.target; advance(20);
      return { before, after, minor0, minor: RM.stats.byStop[11].minor + ((RM.stats.byStop[12] || {}).minor || 0) };`);
    expect(r.before).toBe(0);
    expect(r.minor0).toBe(0);
    expect(r.after).toBeGreaterThan(0);
    expect(r.minor).toBeGreaterThan(0);
  });

  test('the last stretch cuts out completely before Court Sq', async ({ game }) => {
    const r = await game(`${RM} G.Q = []; G.startSegment(12); G.seg._masks = []; G.active.forEach((a) => (a.trigger = 999));
      const L = G.segLen(G.seg); advance(0.2 * L); const early = RM.target; advance(0.3 * L); return { early, late: RM.target };`);
    expect(r.early).toBeGreaterThan(0);
    expect(r.late).toBe(0);
  });

  test('a new ride starts at the top of the tune; the report is quiet', async ({ page, game }) => {
    await game(`ride(7); G.Q = []; advance(5);`);
    await game(`G.peak = 5; G.finalExitChoice = 'escalators'; G.endGame(); advance(0.2);`);
    expect(await game(`${RM} return RM.target;`)).toBe(0);
    const before = await game(`${RM} return RM.stats.bars;`);
    expect(before).toBeGreaterThan(1);
    await page.getByRole('button', { name: /Ride Again|Get back on/ }).first().click();
    // Back at the top of the tune. The game keeps running between the click and this check, so
    // allow the first bar to have started (it's written a moment ahead), but no further.
    const after = await game(`${RM} return { pos: RM.pos, bars: RM.stats.bars };`);
    expect(after.pos).toBeLessThan(4);
    expect(after.bars).toBeLessThanOrEqual(1);
  });

  test('it plays real sound through the Music volume, which can turn it off', async ({ page, game }) => {
    const meter = `const an = A.ac.createAnalyser(); an.fftSize = 2048; RM.pauseGain.connect(an);
      const peak = async (ms) => { let m = 0; const t0 = performance.now(); while (performance.now() - t0 < ms) {
        const d = new Float32Array(an.fftSize); an.getFloatTimeDomainData(d); for (const v of d) m = Math.max(m, Math.abs(v)); await sleep(40); } return m; };`;
    const r = await game(`${RM} ${meter} ride(0); G.Q = []; return await peak(5000);`);
    expect(r).toBeGreaterThan(0.001);
    await page.evaluate(() => (window as any).__S.set({ musicVolume: 0 }));
    expect(await game(`await sleep(400); return A.musicVol.gain.value;`)).toBeLessThan(0.01);
  });
});
