import { test, expect } from './game';

// Chapter select: Chapter II and III start a practice run that saves nothing.
const A_RUN = JSON.stringify([{ date: 1, san: 50, sanPct: 50, peak: 10, acc: { correct: 1, miss: 1, fp: 0 }, trials: 0 }]);
const SAVED = ['gtrain-runs', 'gtrain-psychlog', 'gtrain-tapes', 'gtrain-endings', 'courtSq_endingsArchive', 'gtrain-polaroids', 'gtrain-achievements'];
const snapshot = `return Object.fromEntries(${JSON.stringify(SAVED)}.map((k) => [k, localStorage.getItem(k)]));`;
// Finish the ride with things worth saving: a tape, a caught anomaly and no suspicion (badges).
const FINISH = `const E = window.__EVP; ride(6); G.seg._masks = [];
  G.carBuilder.parents.forEach((p) => { p.force = false; p.mode = 'phone'; p.until = G.GT + 1e6; p.holdUntil = 0; });
  for (let i = 0; i < 200 && G.carBuilder.parents.some((p) => p.facing); i++) advance(0.05);
  E.hasRecorder = true; if (!E.raised) G.toggleRecorder(); E.setKhz(E.khzOf('passenger-hoyt'));
  E.setRecording(true); advance(1.6); E.setRecording(false);
  if (E.tapes.length !== 1) throw new Error('no tape recorded');
  G.stopLog.push({ stop: 7, b: false, name: 'Flushing Av', fps: [], anoms: [{ id: 'sticker', desc: 'The sticker', hit: true }] });
  G.acc.correct = 1; G.peak = 0; G.finalExitChoice = 'escalators'; G.endGame();`;

test.describe('Chapter select (practice runs)', () => {
  test('is locked until a full ride is finished; Chapter II starts a practice run from Bedford–Nostrand', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.clear();
      localStorage.setItem('gtrain-settings', JSON.stringify({ fullscreenOnBoard: false }));
    });
    await page.reload();
    await expect(page.getByTestId('nightmare-locked')).toContainText('chapter select: finish a ride to unlock');
    await expect(page.getByLabel('Start from')).toHaveCount(0);

    await page.evaluate((runs) => localStorage.setItem('gtrain-runs', runs), A_RUN);
    await page.reload();
    const select = page.getByLabel('Start from');
    await expect(select.locator('option')).toHaveText([
      'Chapter I: The Descent, from Hoyt–Schermerhorn',
      'Chapter II: Signal Drift, from Bedford–Nostrand Avs',
      'Chapter III: Operation Skyward, from Nassau Av',
    ]);
    await expect(page.getByTestId('practice-note')).toHaveCount(0);
    await select.selectOption('2');
    await expect(page.getByTestId('practice-note')).toContainText('no endings, badges, Case Files or tapes are saved');

    await page.locator('text=/Board the train/i').click();
    await page.waitForFunction(() => (window as any).__G?.phase !== 'menu');
    const r = await page.evaluate(`(() => { const G = window.__G;
      const before = { practice: G.isPractice, from: G.carBuilder.stA.name, to: G.carBuilder.stB.name };
      for (let t = 0; t < 12.5; t += 0.05) G.update(0.05);
      return { before, segIdx: G.segIdx, stop: G.seg.stop, chapter: G.chapterRollsign && G.chapterRollsign.chapter.index,
        band: G.getBand(6), san: G.san, recorder: window.__EVP.hasRecorder }; })()`);
    expect(r).toMatchObject({
      before: { practice: true, from: 'Bedford–Nostrand Avs', to: 'Myrtle–Willoughby Avs' },
      segIdx: 4,
      stop: 6,
      chapter: 2,
      recorder: false, // Dad still hands it over at the Safe Haven
    });
    expect(r.san).toBeGreaterThanOrEqual(r.band[0]);
    expect(r.san).toBeLessThanOrEqual(r.band[1]);

    await page.evaluate(() => (window as any).__G.pause());
    await expect(page.getByText('PRACTICE RUN: NOTHING IS SAVED')).toBeVisible();
  });

  test('Chapter III starts from Nassau Av at Critical, with the recorder already in hand', async ({ game }) => {
    const r = await game(`G.startChapter = 3; G.startIntro(); const from = G.carBuilder.stA.name; advance(12.5);
      const out = { from, segIdx: G.segIdx, stop: G.seg.stop, san: G.san, recorder: window.__EVP.hasRecorder,
        chapter: G.chapterRollsign && G.chapterRollsign.chapter.index, hint: G.hintText };
      advance(1); out.hint = G.hintText; G.startChapter = 1; return out;`);
    expect(r).toMatchObject({ from: 'Nassau Av', segIdx: 10, stop: 11, recorder: true, chapter: 3 });
    expect(r.san).toBeLessThanOrEqual(9);
    expect(r.hint).toContain('tape recorder');
  });

  test('a practice run saves nothing, and says so on the report; a full ride afterwards saves as usual', async ({ page, game }) => {
    const before = await game(`localStorage.setItem('gtrain-runs', ${JSON.stringify(A_RUN)}); ${snapshot}`);
    await game(`G.startChapter = 2; G.startIntro(); advance(12); ${FINISH}`);
    await expect(page.getByTestId('practice-tag')).toHaveText('PRACTICE');
    await expect(page.getByTestId('practice-note')).toContainText('nothing from this ride is saved');
    await expect(page.getByText('Practice run from Chapter II.')).toBeVisible();
    await expect(page.getByText('STATUS: NOT FILED')).toBeVisible();
    // The caught anomaly is listed for this ride, but not as new to the Case Files.
    expect(await game(`return G.psychLog.ride.map((e) => [e.id, e.hit, e.isNew]);`)).toEqual([['sticker', true, false]]);
    expect(await game(snapshot)).toEqual(before);

    // Ride Again stays a practice run from the same chapter.
    await page.getByRole('button', { name: 'Ride Again' }).click();
    expect(await game(`return [G.isPractice, G.startChapter];`)).toEqual([true, 2]);
    await game(`advance(12); ${FINISH}`);
    expect(await game(snapshot)).toEqual(before);

    // A full ride saves: the ride history, the ending, the Case Files entry and badges.
    await page.getByRole('button', { name: 'Ride Again' }).click();
    await game(`G.startChapter = 1; G.startIntro(); advance(12); ${FINISH}`);
    await expect(page.getByTestId('practice-tag')).toHaveCount(0);
    await expect(page.getByText('STATUS: FILED', { exact: true })).toBeVisible();
    const after = await game(snapshot);
    expect(JSON.parse(after['gtrain-runs'])).toHaveLength(2);
    expect(JSON.parse(after['gtrain-psychlog']).sticker).toMatchObject({ seen: 1, caught: 1 });
    expect(Object.keys(JSON.parse(after['gtrain-achievements']))).toEqual(expect.arrayContaining(['iron_composure', 'first_anomaly']));
    expect(after['gtrain-endings']).not.toBeNull();
    expect(Object.keys(JSON.parse(after['gtrain-tapes']))).toEqual(['passenger-hoyt']);
  });

  test('practice runs don’t unlock Nightmare or chapter select', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.clear();
      localStorage.setItem('gtrain-settings', JSON.stringify({ fullscreenOnBoard: false }));
    });
    await page.reload();
    await page.locator('text=/Board the train/i').click();
    await page.waitForFunction(() => (window as any).__G?.phase !== 'menu');
    // Even a practice ride forced from the engine leaves the ride history empty.
    await page.evaluate(`(() => { const G = window.__G; G.startChapter = 3; G.startIntro();
      for (let t = 0; t < 12; t += 0.05) G.update(0.05); G.finalExitChoice = 'escalators'; G.endGame(); })()`);
    expect(await page.evaluate(() => localStorage.getItem('gtrain-runs'))).toBeNull();
  });
});
