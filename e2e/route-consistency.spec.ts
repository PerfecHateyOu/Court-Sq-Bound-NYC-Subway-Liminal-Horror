import { test, expect } from './game';

// #48: after choosing a line, every place that names a station or the line agrees: the HUD, the
// platforms in view, the announcements, the pause menu, the chapter card and the report.

const NAMES = `({ hud: document.querySelector('[data-testid=hud-route-panel]')?.getAttribute('aria-label'),
  from: G.carBuilder.stA.name, to: G.carBuilder.stB.name, pa: G.paText })`;

test.describe('Route consistency', () => {
  test('switching lines mid-stretch renames the platforms in view, so HUD, PA, sign and pause agree', async ({ page, game }) => {
    await game(`G.Q = []; G.startSegment(5); G.Q = []; G.startSegment(6); G.seg._masks = []; G.active.forEach((a) => (a.trigger = 999)); advance(1);`);
    expect(await game(`return ${NAMES};`)).toMatchObject({ from: 'Myrtle–Willoughby Avs', to: 'Flushing Av' });

    await page.getByTestId('hud-route-panel').click();
    await page.getByRole('dialog').getByRole('button', { name: /^L / }).click();
    const now = await game(`return ${NAMES};`);
    expect(now).toMatchObject({ hud: expect.stringMatching(/^L train, next stop Lorimer St\./), from: 'Bedford Av', to: 'Lorimer St' });

    await page.keyboard.press('KeyP');
    await expect(page.getByTestId('pause-next-stop')).toContainText('Lorimer St');
    await page.keyboard.press('KeyP');

    // Pulling in: the announcement and the platform sign name the same station.
    const arrived = await game(`G.ts = G.segLen(G.seg) - 0.2; advance(0.5); advance(1.5); return ${NAMES};`);
    expect(arrived.pa).toBe('This is Lorimer St.');
    expect(arrived.to).toBe('Lorimer St');

    // And back to the G.
    await game(`window.__RT.setRoute('G');`);
    expect(await game(`return ${NAMES};`)).toMatchObject({ from: 'Myrtle–Willoughby Avs', to: 'Flushing Av' });
  });

  test('a chapter card still on screen follows the line too', async ({ game }) => {
    const r = await game(`G.Q = []; G.lastShownChapterIndex = 0; G.startSegment(10); advance(1); const before = G.chapterRollsign.subtitle;
      window.__RT.setRoute('L'); const after = { title: G.chapterRollsign.title, subtitle: G.chapterRollsign.subtitle };
      window.__RT.setRoute('G'); return { before, after };`);
    expect(r.before).toBe('Greenpoint Av to Court Sq');
    expect(r.after).toEqual({ title: 'THE LAST STRETCH', subtitle: 'Morgan Av to Myrtle–Wyckoff Avs' });
  });

  test('a new ride is back on the G everywhere', async ({ game }) => {
    const r = await game(`window.__RT.setRoute('7'); G.startIntro(); return ${NAMES};`);
    expect(r).toMatchObject({ hud: expect.stringMatching(/^G train/), from: 'Hoyt–Schermerhorn', to: 'Fulton St' });
  });

  test('station names don’t give the Safe Haven away, and the line descriptions only promise what lines change', async ({ page, game }) => {
    const r = await game(`const out = {}; for (const id of ['G', 'L', '7']) { window.__RT.setRoute(id); out[id] = window.__RT.activeRoute.stops; }
      window.__RT.setRoute('G'); return out;`);
    for (const [id, stops] of Object.entries(r as Record<string, string[]>)) {
      for (const [i, name] of stops.entries()) {
        expect(name, `${id} stop ${i}`).not.toMatch(/\(|\)/); // no labels like "(Haven)"
        if (i !== 6) expect(name, `${id} stop ${i}`).not.toMatch(/haven/i); // the Haven is Stop 6
      }
    }
    await page.keyboard.press('KeyL');
    const dialog = page.getByRole('dialog');
    await expect(dialog).toContainText("Ride the same journey on another line's stations.");
    await expect(dialog).not.toContainText(/transit cars|hazard|apparitions|temporal loops/i);
  });
});
