import { test, expect } from './game';
import { EVP_SIGNALS } from '../src/game/evpManager';

// Segment indices (src/constants.ts SEGS): 4 = to Stop 6 (Safe Haven), 5 = 6b, 6 = to Stop 7.
const HAVEN = 4;
const SIX_B = 5;
const TO_7 = 6;

// Keep both parents looking away, stepping game time (not real time).
const LOOK_AWAY = `G.carBuilder.parents.forEach((p) => { p.force = false; p.mode = 'phone'; p.until = G.GT + 1e6; p.holdUntil = 0; });
  for (let i = 0; i < 200 && G.carBuilder.parents.some((p) => p.facing); i++) advance(0.05);`;
const E = `const E = window.__EVP;`;

test.describe('EVP recorder', () => {
  test('Dad hands it over at the Safe Haven; if you skip the Haven, he hands it over on the train', async ({ page, game }) => {
    // Not before Stop 6.
    const before = await game(`${E} ride(0); advance(8); return E.hasRecorder;`);
    expect(before).toBe(false);
    await expect(page.getByRole('button', { name: 'Recorder' })).toHaveCount(0);

    const haven = await game(`${E} ride(${HAVEN}); G.executeSafeHaven(); let line = '';
      for (let i = 0; i < 150 && !E.hasRecorder; i++) advance(0.05);
      line = G.subHtml; return { has: E.hasRecorder, line, hint: G.hintText };`);
    expect(haven.has).toBe(true);
    expect(haven.line).toMatch(/Dad:.*grandfather/);
    expect(haven.hint).toMatch(/tape recorder/);
    await expect(page.getByRole('button', { name: 'Recorder' })).toBeVisible();

    // A new ride: no recorder until it's handed over again; riding 6b without it gets it on the train.
    const train = await game(`${E} G.newGame(); advance(0.1); const fresh = E.hasRecorder;
      ride(${SIX_B}); advance(5.5); const early = E.hasRecorder; advance(1); return { fresh, early, has: E.hasRecorder, line: G.subHtml };`);
    expect(train).toMatchObject({ fresh: false, early: false, has: true });
    expect(train.line).toMatch(/Dad:.*recorder/);
  });

  test('the meter locks on decoys exactly like broadcasts, and has nothing to do with the car', async ({ game }) => {
    const r = await game(`${E} ride(${TO_7}); G.seg._masks = []; E.hasRecorder = true; G.toggleRecorder();
      const read = (khz) => { E.setKhz(khz); advance(0.05); return { meter: +E.meter.toFixed(3), kind: E.locked?.kind ?? null }; };
      const sig = E.khzOf('passenger-hoyt'); const decoy = E.decoysFor(7)[0];
      const onSig = read(sig), onDecoy = read(decoy), nearSig = read(sig + 2), nearDecoy = read(decoy + 2);
      // Car anomalies on or off: same carriers.
      const before = JSON.stringify(E.carriers(7).map((c) => c.khz));
      G.active = []; const none = JSON.stringify(E.carriers(7).map((c) => c.khz));
      // A standstill: nothing.
      const phase = G.phase; G.phase = 'stop'; const still = read(sig); G.phase = phase;
      return { onSig, onDecoy, nearSig, nearDecoy, same: before === none, still };`);
    expect(r.onSig).toEqual({ meter: 1, kind: 'signal' });
    expect(r.onDecoy).toEqual({ meter: 1, kind: 'decoy' });
    expect(r.nearSig.meter).toBeCloseTo(r.nearDecoy.meter, 3);
    expect(r.nearSig.kind).toBeNull();
    expect(r.same).toBe(true);
    expect(r.still).toEqual({ meter: 0, kind: null });
  });

  test('frequencies are reshuffled every ride and kept apart', async ({ game }) => {
    const r = await game(`${E} const runs = [];
      for (let k = 0; k < 4; k++) { E.newRun(); runs.push(['dispatch-hold','passenger-hoyt','conductor','mom-voice'].map((id) => E.khzOf(id))); }
      E.newRun(); let ok = true;
      for (let stop = 6; stop <= 13; stop++) { const cs = E.carriers(stop).map((c) => c.khz).sort((a, b) => a - b);
        for (let i = 1; i < cs.length; i++) if (cs[i] - cs[i - 1] < 4.99) ok = false; }
      return { distinct: new Set(runs.map((x) => x.join())).size, ok };`);
    expect(r.distinct).toBe(4);
    expect(r.ok).toBe(true);
  });

  test('holding record on a broadcast for 1.5 s saves a tape; a decoy or a short hold saves nothing', async ({ page, game }) => {
    const r = await game(`${E} ride(${TO_7}); G.seg._masks = []; ${LOOK_AWAY} E.hasRecorder = true; G.toggleRecorder();
      E.setKhz(E.decoysFor(7)[0]); E.setRecording(true); advance(3); const afterDecoy = E.tapes.length;
      E.setRecording(false); E.setKhz(E.khzOf('passenger-hoyt')); E.setRecording(true); advance(1.2); E.setRecording(false);
      const afterShort = E.tapes.length;
      E.setRecording(true); advance(1.6); E.setRecording(false);
      return { afterDecoy, afterShort, tape: E.tapes[0] };`);
    await expect(page.getByTestId('evp-transcript')).toContainText('Saved to tape: A passenger');
    // The same broadcast isn't saved twice.
    const again = await game(`${E} E.setRecording(true); advance(2); E.setRecording(false);
      return { n: E.tapes.length, archive: JSON.parse(localStorage.getItem('gtrain-tapes')) };`);
    expect(r.afterDecoy).toBe(0);
    expect(r.afterShort).toBe(0);
    expect(r.tape).toMatchObject({ signalId: 'passenger-hoyt', title: 'A passenger', stop: '7' });
    expect(again.n).toBe(1);
    expect(again.archive['passenger-hoyt'].count).toBe(1);
  });

  test('raising it while a parent watches costs Suspicion once per raise; unwatched costs nothing', async ({ game }) => {
    const unwatched = await game(`${E} ride(${TO_7}); G.seg._masks = []; ${LOOK_AWAY} E.hasRecorder = true; const s0 = G.sus;
      G.toggleRecorder(); advance(1); const d = G.sus - s0; G.toggleRecorder(); return d;`);
    expect(unwatched).toBe(0);

    const watched = await game(`${E} const mom = G.carBuilder.parents[0]; mom.force = true;
      for (let i = 0; i < 200 && !mom.facing; i++) advance(0.05);
      const s0 = G.sus; G.toggleRecorder(); advance(2); const once = G.sus - s0;
      const reason = G.susLog[G.susLog.length - 1]?.reason;
      G.toggleRecorder(); G.toggleRecorder(); advance(0.5); const twice = G.sus - s0;
      mom.force = false; return { once, twice, reason };`);
    expect(watched.once).toBe(10);
    expect(watched.twice).toBe(20);
    expect(watched.reason).toMatch(/tape recorder while Mom was watching/);
  });

  test('hands are busy: it puts down the camera, blocks flagging, and comes down for prompts', async ({ page, game }) => {
    const r = await game(`${E} ride(${TO_7}); G.seg._masks = []; E.hasRecorder = true; const P = window.__P;
      P.setViewfinder(true); G.toggleRecorder(); const vfAfterRaise = P.isViewfinderOpen;
      G.flagHeld = true; G.gazeTid = 'anything'; for (let i = 0; i < 30; i++) G.updateFlag(0.05);
      const prog = G.flagProg; G.flagHeld = false;
      return { raised: E.raised, prog, vfAfterRaise };`);
    expect(r.raised).toBe(true);
    expect(r.vfAfterRaise).toBe(false);
    expect(r.prog).toBe(0);
    await expect(page.getByTestId('evp-recorder')).toBeVisible();
    await expect(page.getByRole('button', { name: /^Flag/ })).toHaveCount(0);

    // C (camera) lowers the recorder.
    await page.keyboard.press('KeyC');
    await expect.poll(() => game(`return window.__EVP.raised;`)).toBe(false);
    await page.keyboard.press('Escape');

    // A choice or the restraint lowers it and keeps it down.
    const prompts = await game(`${E} window.__P.setViewfinder(false); G.toggleRecorder(); const up = E.raised;
      G.startMaskCheck(); const duringChoice = E.raised; const reraise = G.toggleRecorder();
      return { up, duringChoice, reraise, choice: !!G.choice };`);
    expect(prompts).toEqual({ up: true, duringChoice: false, reraise: false, choice: true });
  });

  test('keyboard, wheel and strip tune it; transcript fills in as you listen', async ({ page, game }) => {
    await game(`${E} ride(${TO_7}); G.seg._masks = []; ${LOOK_AWAY} E.hasRecorder = true; E.setKhz(120);`);
    await page.keyboard.press('KeyR');
    const khz = page.getByTestId('evp-khz');
    await expect(khz).toHaveText('120.0');
    await page.keyboard.press('BracketRight');
    await expect(khz).toHaveText('120.5');
    await page.keyboard.press('Shift+BracketLeft');
    await expect(khz).toHaveText('120.4');
    await page.mouse.move(400, 300);
    await page.mouse.wheel(0, -100);
    await expect(khz).toHaveText('120.9');

    const strip = page.getByTestId('evp-strip');
    const box = (await strip.boundingBox())!;
    const y = box.y + box.height / 2;
    await page.mouse.move(box.x + 40, y);
    await page.mouse.down();
    await page.mouse.move(box.x + 70, y, { steps: 3 });
    await page.mouse.up();
    await expect(khz).toHaveText('123.9');

    // Lock on a broadcast and listen: words appear a little at a time.
    const partial = await game(`${E} E.setKhz(E.khzOf('passenger-hoyt')); advance(1); return E.reveal;`);
    expect(partial).toBeGreaterThan(0.2);
    expect(partial).toBeLessThan(0.5);
    const t = page.getByTestId('evp-transcript');
    await expect(t).toContainText('Hoyt');
    await expect(t).not.toContainText('I always get on at Hoyt…');
    await game(`advance(2.5);`);
    await expect(t).toContainText('I always get on at Hoyt. I always get on at Hoyt…');

    // Decoy: a carrier tone, no words.
    await game(`${E} E.setKhz(E.decoysFor(7)[0]); advance(0.1);`);
    await expect(t).toHaveText(/carrier tone, no voice/);

    await page.keyboard.press('KeyR');
    await expect(page.getByTestId('evp-recorder')).toHaveCount(0);
  });

  test('Space and the REC button record', async ({ page, game }) => {
    await game(`${E} ride(${TO_7}); G.seg._masks = []; ${LOOK_AWAY} E.hasRecorder = true; G.toggleRecorder();`);
    await page.keyboard.down('Space');
    await expect.poll(() => game(`return window.__EVP.recording;`)).toBe(true);
    await page.keyboard.up('Space');
    await expect.poll(() => game(`return window.__EVP.recording;`)).toBe(false);

    const rec = page.getByRole('button', { name: /HOLD\s*TO REC/ });
    const b = (await rec.boundingBox())!;
    await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
    await page.mouse.down();
    await expect.poll(() => game(`return window.__EVP.recording;`)).toBe(true);
    await page.mouse.up();
    await expect.poll(() => game(`return window.__EVP.recording;`)).toBe(false);
  });

  test('the sound sits on the game bus and follows the recorder', async ({ game }) => {
    const level = () => game<number>(`return A.getEvpAudio()?.level ?? -1;`);
    await game(`${E} ride(${TO_7}); G.seg._masks = []; E.hasRecorder = true; G.toggleRecorder(); advance(0.1);`);
    await expect.poll(level).toBeGreaterThan(0.8);
    await game(`G.toggleRecorder(); advance(0.1);`);
    await expect.poll(level).toBeLessThan(0.1);
  });

  test('tapes show in the evidence log and the report, are counted in the Case Files, and Erase clears them', async ({ page, game }) => {
    await game(`${E} ride(${TO_7}); G.seg._masks = []; ${LOOK_AWAY} E.hasRecorder = true; G.toggleRecorder();
      E.setKhz(E.khzOf('passenger-hoyt')); E.setRecording(true); advance(1.6); E.setRecording(false); G.toggleRecorder();
      window.__P.setAlbum(true); await sleep(300);`);
    await page.getByRole('tab', { name: 'TAPES (1)' }).click();
    await expect(page.getByRole('tabpanel')).toContainText('A passenger');
    await expect(page.getByRole('tabpanel')).toContainText('I always get on at Hoyt');

    await game(`window.__P.setAlbum(false); G.endGame(); await sleep(400);`);
    const tapes = page.locator('[aria-labelledby="tapes-h"]');
    await expect(tapes).toContainText('Tapes (1)');
    await expect(tapes).toContainText('A passenger');

    // Kept on the device: the Case Files count it on the next visit.
    await page.goto('/');
    await page.getByRole('button', { name: /Case Files/ }).click();
    const files = page.getByRole('dialog', { name: 'Case Files & Career Archive' });
    await expect(files.getByText(/^Tapes: /)).toHaveText(`Tapes: 1/${EVP_SIGNALS.length}`);
    await page.keyboard.press('Escape');

    await page.getByRole('button', { name: 'Settings' }).click();
    const d = page.locator('[role=dialog]').last();
    await d.getByRole('button', { name: 'Erase saved progress' }).click();
    await d.locator('[role=alertdialog]').getByRole('button', { name: 'Erase' }).click();
    await expect(d.getByText('Saved progress erased.')).toBeVisible();
    expect(await page.evaluate(() => localStorage.getItem('gtrain-tapes'))).toBeNull();
  });
});

// A saved tape, without recording one.
const HAS_TAPE = `window.__EVP.hasRecorder = true; window.__EVP.tapes = [{ signalId: 'passenger-hoyt', title: 'A passenger', stop: '7',
  freq: '120.0 kHz', transcript: '…I got on at Hoyt too…', gt: 0 }];`;
const level = `return A.getTapeLevel();`;

test.describe('Tape playback', () => {
  test('on the report it plays for free, louder than the ducked game, and stops by itself or on Stop', async ({ page, game }) => {
    await game(`${HAS_TAPE} G.peak = 20; G.finalExitChoice = 'escalators'; G.endGame();`);
    const sus0 = await game<number>(`return G.sus;`);
    const tapes = page.locator('[aria-labelledby="tapes-h"]');
    await tapes.getByRole('button', { name: 'Play tape: A passenger' }).click();
    await expect(tapes.getByRole('button', { name: 'Stop tape: A passenger' })).toHaveAttribute('aria-pressed', 'true');
    await expect.poll(() => game<number>(level)).toBeGreaterThan(0.8); // the report ducks the game bus to 0.2
    expect(await game<number>(`return G.sus;`)).toBe(sus0);

    await tapes.getByRole('button', { name: 'Stop tape: A passenger' }).click();
    await expect.poll(() => game<number>(level)).toBe(0);
    await expect(tapes.getByRole('button', { name: 'Play tape: A passenger' })).toBeVisible();

    // Left alone, it ends on its own.
    await tapes.getByRole('button', { name: 'Play tape: A passenger' }).click();
    const dur = await game<number>(`return (G.tapePlaying.endsAt - Date.now()) / 1000;`);
    expect(dur).toBeGreaterThan(1);
    expect(dur).toBeLessThan(15);
    await expect(tapes.getByRole('button', { name: 'Play tape: A passenger' })).toBeVisible({ timeout: 20_000 });
  });

  test('during the ride, playing it while a parent watches costs Suspicion once', async ({ page, game }) => {
    await game(`ride(${TO_7}); G.seg._masks = []; ${HAS_TAPE}
      const mom = G.carBuilder.parents[0]; mom.force = true; for (let i = 0; i < 200 && !mom.facing; i++) advance(0.05);
      window.__P.setAlbum(true);`);
    await page.getByRole('tab', { name: /TAPES/ }).click();
    const s0 = await game<number>(`return G.sus;`);
    await page.getByRole('button', { name: 'Play tape: A passenger' }).click();
    const r = await game(`advance(2); return { d: G.sus - ${s0}, reason: G.susLog[G.susLog.length - 1]?.reason, playing: !!G.tapePlaying };`);
    expect(r).toMatchObject({ d: 10, playing: true });
    expect(r.reason).toMatch(/Played a tape out loud while Mom was watching/);
  });

  test('unwatched, it may make a parent turn toward the sound', async ({ game }) => {
    const r = await game(`ride(${TO_7}); G.seg._masks = []; ${LOOK_AWAY} ${HAS_TAPE}
      const real = Math.random;
      Math.random = () => 0.99; G.playTape('passenger-hoyt'); advance(1); const quiet = G.carBuilder.parents.filter((p) => p.mode === 'player').length;
      G.stopTape(); ${LOOK_AWAY}
      Math.random = () => 0.1; G.playTape('passenger-hoyt'); advance(1); const turned = G.carBuilder.parents.filter((p) => p.mode === 'player').length;
      Math.random = real; G.stopTape(); return { quiet, turned };`);
    expect(r).toEqual({ quiet: 0, turned: 1 });
  });

  test('pausing or a new ride stops it', async ({ game }) => {
    const r = await game(`ride(${TO_7}); G.seg._masks = []; ${HAS_TAPE}
      G.playTape('passenger-hoyt'); const on = !!G.tapePlaying; G.pause(); const afterPause = !!G.tapePlaying; G.resume();
      G.playTape('passenger-hoyt'); G.startIntro(); return { on, afterPause, afterNew: !!G.tapePlaying, level: A.getTapeLevel() };`);
    expect(r).toEqual({ on: true, afterPause: false, afterNew: false, level: 0 });
  });
});
