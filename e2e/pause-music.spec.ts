import { test, expect, type Run } from './game';

// Peak RMS of the final output over a window, so checks hear real signal, not just scheduled notes.
const METER = `if (!window.__peakRms) { const an = A.ac.createAnalyser(); an.fftSize = 2048; A.outGain.connect(an);
  window.__peakRms = async (ms) => { let m = 0; const t0 = performance.now();
    while (performance.now() - t0 < ms) { const d = new Float32Array(an.fftSize); an.getFloatTimeDomainData(d);
      let s = 0; for (const v of d) s += v * v; m = Math.max(m, Math.sqrt(s / d.length)); await sleep(40); } return m; }; }`;
const M = (game: Run, s: string) => game(`const M = A.getPauseMusic(); ${METER} ${s}`);

test.describe('pause music', () => {
  test('starts on pause, ducks the game, mutes, and stops on resume', async ({ page, game }) => {
    await M(game, `ride(0); toTier(95, 0);`);
    await page.keyboard.press('KeyP');
    const s1 = await M(game, `await sleep(2200); return { playing: M.playing, music: M.bus.gain.value, game: A.masterGain.gain.value,
      notes: M.stats.notes, rms: await window.__peakRms(1500) };`);
    expect(s1.playing).toBe(true);
    expect(s1.music).toBeGreaterThan(0.9);
    expect(s1.game).toBeLessThan(0.02);
    expect(s1.rms).toBeGreaterThan(0.003);

    await page.keyboard.press('KeyM');
    expect(await M(game, `await sleep(500); return await window.__peakRms(1200);`)).toBeLessThan(0.0005);
    await page.keyboard.press('KeyM');

    await page.keyboard.press('KeyP');
    const s3 = await M(game, `await sleep(1800); return { playing: M.playing, music: M.bus.gain.value, game: A.masterGain.gain.value, paused: G.paused };`);
    expect(s3.playing).toBe(false);
    expect(s3.music).toBeLessThan(0.02);
    expect(s3.game).toBeGreaterThan(0.8);
    expect(s3.paused).toBe(false);
  });

  test('the pause menu plays the tune clean at every tier: a pocket of normal', async ({ page, game }) => {
    for (const [t, san] of [[0, 95], [1, 60], [2, 25], [3, 5]]) {
      await M(game, `toTier(${san}, ${t});`);
      await page.keyboard.press('KeyP');
      const s = await M(game, `await sleep(2500); return { playing: M.playing, melody: M.stats.melodyNotes };`);
      expect(s.playing).toBe(true);
      expect(s.melody).toBeGreaterThan(0); // the tune, not just chords
      await page.keyboard.press('KeyP');
      await page.waitForTimeout(800);
    }
  });

  test('the pause tune plays the melody on a steady tempo (30 s offline render)', async ({ game }) => {
    // Offline, so the result doesn't depend on how busy the machine is.
    const r = await M(game, `const oc = new OfflineAudioContext(1, 44100 * 30, 44100); const m = new (M.constructor)(oc, oc.destination);
      m.playing = true; m.nextStepTime = 0.1;
      while (m.nextStepTime < 28.5) { m.playStep(m.nextStepTime); m.nextStepTime += m.stepDuration(); m.step++; if (m.step % 8 === 0) m.bar++; }
      return { melody: m.stats.melodyNotes, bars: m.bar };`);
    expect(r.melody).toBeGreaterThan(30);
    expect(r.bars).toBeGreaterThanOrEqual(7); // 68 bpm, 4/4
  });

  test('tab switches, restart, and the report screen', async ({ page, game }) => {
    await M(game, `ride(0); toTier(95, 0);`);
    await page.keyboard.press('KeyP');
    await page.waitForTimeout(800);
    const hidden = await game(`Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
      document.dispatchEvent(new Event('visibilitychange')); await sleep(600); return A.ac.state;`);
    expect(hidden).toBe('suspended');
    const back = await M(game, `Object.defineProperty(document, 'hidden', { configurable: true, get: () => false });
      document.dispatchEvent(new Event('visibilitychange')); await sleep(1500);
      return { ctx: A.ac.state, playing: M.playing, music: M.bus.gain.value, paused: G.paused };`);
    expect(back.ctx).toBe('running');
    expect(back.playing).toBe(true);
    expect(back.music).toBeGreaterThan(0.8);

    await page.locator('text=/Restart Ride/i').click();
    const r = await M(game, `await sleep(1800); return { playing: M.playing, game: A.masterGain.gain.value, phase: G.phase, paused: G.paused };`);
    expect(r).toMatchObject({ playing: false, phase: 'intro', paused: false });
    expect(r.game).toBeGreaterThan(0.8);

    await game(`G.endGame();`);
    await page.waitForTimeout(600);
    await page.keyboard.press('KeyP');
    expect(await M(game, `await sleep(600); return { paused: G.paused, playing: M.playing };`)).toEqual({ paused: false, playing: false });
  });
});
