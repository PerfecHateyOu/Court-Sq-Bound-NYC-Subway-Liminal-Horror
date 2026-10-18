import { test, expect } from './game';

// Run a segment to its arrival choice, stepping game time, collecting what the PA and parents say.
const ARRIVE = (seg: number) => `G.Q = []; G.startSegment(${seg}); G.active.forEach((a) => (a.trigger = 999)); G.seg._masks = [];
  const said = []; let last = '';
  for (let i = 0; i < 4000 && !G.choice; i++) { advance(0.05); for (const t of [G.paText, G.subHtml]) if (t && t !== last && !said.includes(t)) said.push(t); }`;
const END = (o: string) => `G.peak = 20; G.interventions = 0; G.trials = []; G.finalExitChoice = 'escalators'; ${o} G.endGame();`;

test.describe('Place names follow the route', () => {
  test('on the G, the ending and report read as before', async ({ page, game }) => {
    await game(END(''));
    const report = page.locator('article.ticket-slip');
    await expect(report).toContainText('G train, Hoyt–Schermerhorn to Court Sq.');
    await expect(report).toContainText('You made it to Court Square. Your parents push through the turnstiles, already arguing about where to eat in Long Island City.');
  });

  test('on the L, endings and the report name the L’s stops and streets', async ({ page, game }) => {
    await game(`window.__RT.setRoute('L'); ${END('')}`);
    const report = page.locator('article.ticket-slip');
    await expect(report).toContainText('L train, 8th Av to Myrtle–Wyckoff Avs.');
    await expect(report).toContainText('You made it to Myrtle–Wyckoff.');
    await expect(report).toContainText('where to eat in Ridgewood');
    await expect(report).not.toContainText(/Court Sq|Long Island City|45th Road/);

  });

  test('the Eternal Commute sends you back to the route’s own first stop, and names its own bait', async ({ page, game }) => {
    await game(`window.__RT.setRoute('7'); ${END("G.trials = [{ stop: 12, depth: 1, clean: false }];")}`);
    const report = page.locator('article.ticket-slip');
    await expect(report).toContainText('The sign says Times Sq–42nd St.');
    await expect(report).toContainText('Stepped off at Court Sq Tower Vault'); // its archive summary, now reached
  });

  test('announcements, station names and the stop log use the route’s stops', async ({ game }) => {
    const r = await game(`window.__RT.setRoute('L');
      let said7, finalSaid;
      { ${ARRIVE(6)} said7 = G.stopLog[G.stopLog.length - 1].name; }
      G.choice = null;
      { ${ARRIVE(12)} finalSaid = said; }
      return { said7, finalSaid };`);
    expect(r.said7).toBe('Lorimer St');
    expect(r.finalSaid.join(' | ')).toContain('Myrtle–Wyckoff. This is the last stop on this train.');
    expect(r.finalSaid.join(' | ')).toContain('Here we are. Myrtle–Wyckoff.');
    expect(r.finalSaid.join(' | ')).not.toContain('Court Square');
  });

  test('False Stop Trial signs point the route’s way', async ({ game }) => {
    const signs = await game(`window.__RT.setRoute('L'); G.Q = []; G.startSegment(8);
      const seen = new Set(); const real = G.trialBuilder.setSignText.bind(G.trialBuilder);
      G.trialBuilder.setSignText = (o, t) => { seen.add(t); real(o, t); };
      G.startTrial(); for (let d = 0; d < 4; d++) { G.trial.depth = d; for (const m of ['paths', 'board']) { G.trial.mode = m; G.newTrialRound(); } }
      G.trialBuilder.setSignText = real; return [...seen];`);
    const all = signs.join(' | ');
    expect(all).toContain('To Myrtle–Wyckoff Avs trains');
    expect(all).toContain('To 8 Av trains');
    expect(all).toContain('Myrtle–Wyckoff Avs-bound L');
    expect(all).toContain('8th Av');
    expect(all).not.toMatch(/Court Sq|Church Av|Hoyt/);
  });

  test('broadcasts name the route’s stops', async ({ game }) => {
    const r = await game(`const E = window.__EVP; E.newRun(); E.hasRecorder = true; window.__RT.setRoute('L');
      const take = (seg, id) => { G.Q = []; G.startSegment(seg); G.seg._masks = []; if (!E.raised) G.toggleRecorder(); E.setKhz(E.khzOf(id));
        E.setRecording(true); advance(1.6); E.setRecording(false); return E.tapes.find((t) => t.signalId === id)?.transcript; };
      const out = { hoyt: take(6, 'passenger-hoyt'), hold: take(6, 'dispatch-hold'), easier: take(9, 'passenger-greenpoint') };
      G.toggleRecorder(); return out;`);
    expect(r.hoyt).toBe('…I got on at 8th Av too. I always get on at 8th Av. I always get on at 8th Av…');
    expect(r.hold).toBe('…L four-forty, hold at Montrose Av. Hold. Do not open the doors at Montrose Av…');
    expect(r.easier).toContain('It gets easier after Morgan Av.');
  });
  test('the pause menu names the route’s line, bullet and next stop', async ({ page, game }) => {
    await game(`ride(6);`); // heading to stop 7
    await page.keyboard.press('KeyP');
    await expect(page.locator('[data-testid=pause-line]')).toHaveText('Brooklyn–Queens Crosstown');
    await expect(page.locator('[data-testid=pause-next-stop]')).toContainText('GFlushing Av');
    await page.keyboard.press('KeyP');

    await game(`window.__RT.setRoute('L');`);
    await page.keyboard.press('KeyP');
    await expect(page.locator('[data-testid=pause-line]')).toHaveText('14th St–Canarsie Express');
    await expect(page.locator('[data-testid=pause-next-stop]')).toContainText('LLorimer St');
    await expect(page.locator('[data-testid=pause-next-stop]')).not.toContainText('Flushing Av');
    // A restart starts a new ride on the G, so the confirmation says so.
    await page.locator('text=/Restart Ride/i').click();
    await expect(page.locator('[role=alertdialog]')).toContainText('Start over from the G at Hoyt–Schermerhorn?');
  });

  test('on the G, the restart confirmation reads as before', async ({ page, game }) => {
    await game(`ride(2);`);
    await page.keyboard.press('KeyP');
    await page.locator('text=/Restart Ride/i').click();
    await expect(page.locator('[role=alertdialog]')).toContainText('Start over from Hoyt–Schermerhorn?');
  });

  test('in a practice run, the restart confirmation names the chapter’s first station', async ({ page, game }) => {
    await game(`G.startChapter = 2; G.startIntro(); advance(12.5);`);
    await page.keyboard.press('KeyP');
    await page.locator('text=/Restart Ride/i').click();
    await expect(page.locator('[role=alertdialog]')).toContainText('Start over from Bedford–Nostrand Avs?');
    await page.locator('[role=alertdialog]').locator('text=/^Restart$/').click();
    expect(await game(`advance(12.5); return [G.isPractice, G.carBuilder.stA.name];`)).toEqual([true, 'Bedford–Nostrand Avs']);
  });
});
