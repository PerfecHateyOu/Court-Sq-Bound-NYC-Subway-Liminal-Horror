import { test, expect } from './game';
import { ENDING_IDS } from '../src/game/endings';

// Run a segment to its arrival choice, stepping game time.
const ARRIVE = (seg: number) => `G.Q = []; G.startSegment(${seg}); G.active.forEach((a) => (a.trigger = 999)); G.seg._masks = [];
  for (let i = 0; i < 4000 && !G.choice; i++) advance(0.05);
  if (!G.choice) throw new Error('no choice at segment ${seg}');`;

// A summary that earns nothing special; each test changes one thing.
const BASE = `{ peak: 20, interventions: 0, trialStops: [], sanPct: 50, accPct: 50, restraintOK: false, tapes: [], exit: 'escalators' }`;

test.describe('Chapters', () => {
  test('a silent rollsign opens each chapter, labelled from the route, and the HUD badge follows', async ({ page, game }) => {
    await page.setViewportSize({ width: 1280, height: 720 }); // the badge is wide-screen only
    const sign = page.getByTestId('chapter-rollsign');
    const badge = page.getByTestId('chapter-badge');
    const show = (seg: number) =>
      game(`G.Q = []; ${seg === 0 ? 'G.lastShownChapterIndex = 0;' : ''}
        let chimes = 0; const real = A.chime.bind(A); A.chime = () => { chimes++; real(); };
        G.startSegment(${seg}); advance(1); A.chime = real;
        return { chimes, sign: G.chapterRollsign && { title: G.chapterRollsign.title, subtitle: G.chapterRollsign.subtitle } };`);

    const one = await show(0);
    expect(one).toEqual({ chimes: 0, sign: { title: 'THE DESCENT', subtitle: 'Hoyt–Schermerhorn to Bedford–Nostrand Avs' } });
    await expect(sign).toContainText('CHAPTER I');
    await expect(badge).toContainText('CH. I');

    // No new card within a chapter.
    await game(`advance(5);`);
    expect((await show(1)).sign).toBeNull();

    expect((await show(4)).sign).toEqual({ title: 'SIGNAL DRIFT', subtitle: 'Myrtle–Willoughby Avs to Nassau Av' });
    await expect(sign).toContainText('CHAPTER II');
    await expect(badge).toContainText('CH. II // SIGNAL DRIFT');

    const three = await show(10);
    expect(three).toEqual({ chimes: 0, sign: { title: 'OPERATION SKYWARD', subtitle: 'Greenpoint Av to Court Sq' } });
    await expect(sign).toContainText('Greenpoint Av to Court Sq');

    // A prompt hides it.
    await game(`G.startMaskCheck();`);
    await expect(sign).toHaveCount(0);
  });

  test('off the G, Chapter III is The Last Stretch, with that route’s stops and bullet', async ({ page, game }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    const r = await game(`window.__RT.setRoute('L'); G.Q = []; G.startSegment(10); advance(1);
      return { title: G.chapterRollsign.title, subtitle: G.chapterRollsign.subtitle };`);
    expect(r).toEqual({ title: 'THE LAST STRETCH', subtitle: 'Morgan Av to Myrtle–Wyckoff Avs' });
    await expect(page.getByTestId('chapter-rollsign')).toContainText('L');
    await expect(page.getByTestId('chapter-badge')).toContainText('THE LAST STRETCH');
  });
});

test.describe('Doors and the exit', () => {
  test('21 St is an ordinary door choice, and stepping off there starts the False Stop Trial', async ({ game }) => {
    const r = await game(`${ARRIVE(11)} const items = G.choice.items.map((i) => i.txt);
      G.pickChoiceIndex(items.findIndex((t) => /step off/i.test(t))); advance(0.5);
      return { items, phase: G.phase };`);
    expect(r.items).toEqual(['Stay on', 'Step off']);
    expect(r.phase).toBe('trial');
  });

  test('the Court Sq exit offers the same three ways out whatever you carry, and says nothing about what’s open', async ({ page, game }) => {
    const empty = await game(`window.__EVP.tapes = []; ${ARRIVE(12)} return G.choice.items.map((i) => i.txt);`);
    const full = await game(`G.choice = null; window.__EVP.tapes = [{ signalId: 'conductor' }, { signalId: 'mom-voice' }, { signalId: 'warning-time' }];
      ${ARRIVE(12)} return G.choice.items.map((i) => i.txt);`);
    expect(empty).toEqual(['Follow Mom and Dad to the escalators', 'Follow the static down the side stairs', 'Push through the emergency door']);
    expect(full).toEqual(empty);
    await expect(page.locator('body')).not.toContainText(/UNLOCKED|Signal Lost|padlock/i);

    const r = await game(`G.pickChoiceIndex(1); advance(4); return { exit: G.finalExitChoice, phase: G.phase };`);
    expect(r).toEqual({ exit: 'lower_level', phase: 'end' });
  });
});

test.describe('Endings', () => {
  test('are earned, in priority order', async ({ game }) => {
    const r = await game(`const E = window.__END; const base = ${BASE};
      const end = (o) => E.resolveEnding({ ...base, ...o }).id;
      const dawn = { exit: 'escalators', restraintOK: true, tapes: ['conductor'], sanPct: 60 };
      return {
        plain: end({}),
        secret: end({ peak: 0, trialStops: [12], sanPct: 5 }),                       // beats everything
        loopBait: end({ trialStops: [12], ...{ restraintOK: true, tapes: ['conductor'] } }),
        loopSanity: end({ sanPct: 29, exit: 'lower_level', tapes: ['a', 'b'], accPct: 90 }),
        archivist: end({ exit: 'lower_level', tapes: ['a', 'b'], accPct: 75, peak: 30 }),
        archivistShort: end({ exit: 'lower_level', tapes: ['a'], accPct: 90, peak: 10 }),
        archivistLoud: end({ exit: 'lower_level', tapes: ['a', 'b'], accPct: 90, peak: 31 }),
        skyward: end({ exit: 'surface_hatch', restraintOK: true }),
        skywardTrial: end({ exit: 'surface_hatch', restraintOK: true, trialStops: [4] }),
        dawn: end(dawn),
        dawnNoTape: end({ ...dawn, tapes: [] }),
        dawnLowSanity: end({ ...dawn, sanPct: 59 }),
        dawnWrongExit: end({ ...dawn, exit: 'surface_hatch', restraintOK: false }),
        exposed: end({ interventions: 1, trialStops: [4] }),
        collapse: end({ trialStops: [4] }),
      };`);
    expect(r).toEqual({
      plain: 'civilian_extraction',
      secret: 'secret_mask',
      loopBait: 'eternal_commute',
      loopSanity: 'eternal_commute',
      archivist: 'signal_archivist',
      archivistShort: 'civilian_extraction',
      archivistLoud: 'civilian_extraction',
      skyward: 'skyward_void',
      skywardTrial: 'collapse',
      dawn: 'dawn_horizon',
      dawnNoTape: 'civilian_extraction',
      dawnLowSanity: 'civilian_extraction',
      dawnWrongExit: 'civilian_extraction',
      exposed: 'exposed',
      collapse: 'collapse',
    });
  });

  test('the ride’s real state decides it: a Trial at 21 St loops you back', async ({ page, game }) => {
    const id = await game(`G.peak = 20; G.trials = [{ stop: 12, depth: 1, clean: false }]; G.finalExitChoice = 'escalators';
      G.endGame(); return G.resolvedEnding.id;`);
    expect(id).toBe('eternal_commute');
    const report = page.locator('article.ticket-slip');
    await expect(report).toContainText('[LOOP: THE ETERNAL COMMUTE]');
    await expect(report).toContainText('The sign says Hoyt');
  });

  test('the report hides endings you haven’t reached; the archive is kept, counted in the Case Files, and erased', async ({ page, game }) => {
    // An archive saved by the first Phase 3 build is carried over.
    await page.evaluate(() =>
      localStorage.setItem('courtSq_endingsArchive', JSON.stringify({ secret_mask: { id: 'secret_mask', discoveredAt: 1, count: 1 }, skyward_gone: { count: 1 } }))
    );
    await game(`G.peak = 20; G.trials = []; G.interventions = 0; G.finalExitChoice = 'escalators'; G.endGame();`);

    const archive = page.locator('[aria-labelledby="endings-archive-h"]');
    await expect(archive).toContainText('2 / 8 documented');
    await expect(archive.getByText('The Unbroken Mask', { exact: true })).toBeVisible();
    await expect(archive.getByText('Civilian Extraction', { exact: true })).toBeVisible();
    await expect(archive.getByText('Undocumented Outcome')).toHaveCount(6);
    await expect(archive.getByText('[REDACTED]')).toHaveCount(6);
    // Nothing about endings not yet reached.
    for (const hidden of ['Midnight Terminal', 'Dawn Horizon', 'Skyward Catwalk', 'Eternal Commute', 'conductor', 'restraint']) {
      await expect(archive).not.toContainText(hidden);
    }
    const stored = await page.evaluate(() => ({ now: JSON.parse(localStorage.getItem('gtrain-endings') || '{}'), legacy: localStorage.getItem('courtSq_endingsArchive') }));
    expect(Object.keys(stored.now).sort()).toEqual(['civilian_extraction', 'secret_mask']);
    expect(stored.legacy).toBeNull();

    await page.goto('/');
    await page.getByRole('button', { name: /Case Files/ }).click();
    const files = page.getByRole('dialog', { name: 'Case Files & Career Archive' });
    await expect(files.getByText(/^Endings: /)).toHaveText(`Endings: 2/${ENDING_IDS.length}`);
    await page.keyboard.press('Escape');

    await page.getByRole('button', { name: 'Settings' }).click();
    const d = page.locator('[role=dialog]').last();
    await d.getByRole('button', { name: 'Erase saved progress' }).click();
    await d.locator('[role=alertdialog]').getByRole('button', { name: 'Erase' }).click();
    await expect(d.getByText('Saved progress erased.')).toBeVisible();
    expect(await page.evaluate(() => localStorage.getItem('gtrain-endings'))).toBeNull();
  });

  test('the conductor speaks to the route you’re on', async ({ game }) => {
    const r = await game(`const E = window.__EVP; E.newRun(); E.hasRecorder = true;
      const take = () => { G.Q = []; G.startSegment(11); G.seg._masks = []; G.toggleRecorder(); E.setKhz(E.khzOf('conductor'));
        E.setRecording(true); advance(1.6); E.setRecording(false); G.toggleRecorder(); return E.tapes.find((t) => t.signalId === 'conductor')?.transcript; };
      const onG = take(); E.tapes = []; window.__RT.setRoute('7'); const on7 = take(); return { onG, on7 };`);
    expect(r.onG).toContain('above ground');
    expect(r.on7).toContain('under the river');
  });
});

test.describe('Get back on', () => {
  test('after The Eternal Commute the report offers "Get back on": straight back into a ride you\u2019ve been on before', async ({ page, game }) => {
    await game(`G.peak = 20; G.trials = [{ stop: 12, depth: 1, clean: false }]; G.endGame();`);
    await expect(page.getByRole('button', { name: 'Ride Again' })).toHaveCount(0);
    await page.getByRole('button', { name: 'Get back on' }).click();
    await expect(page.locator('text=/Board the train/i')).toHaveCount(0); // no start screen

    const r = await game(`const phase = G.phase, looped = G.looped, report = !!document.querySelector('article.ticket-slip');
      advance(3); const hint = G.hintText; advance(6.2); return { phase, looped, report, hint, sub: G.subHtml };`);
    expect(r).toMatchObject({ phase: 'intro', looped: true, report: false, hint: '' });
    expect(r.sub).toContain('He said that last time, too.');
  });

  test('any other ending keeps Ride Again, a normal ride with the hint', async ({ page, game }) => {
    await game(`G.peak = 20; G.trials = []; G.finalExitChoice = 'escalators'; G.endGame();`);
    await expect(page.getByRole('button', { name: 'Get back on' })).toHaveCount(0);
    await page.getByRole('button', { name: 'Ride Again' }).click();
    const r = await game(`advance(3); const hint = G.hintText; advance(6.2); return { phase: G.phase, looped: G.looped, hint, sub: G.subHtml };`);
    expect(r.looped).toBe(false);
    expect(r.hint).toMatch(/Hold (F|FLAG)/);
    expect(r.sub).not.toContain('last time');
  });
});
