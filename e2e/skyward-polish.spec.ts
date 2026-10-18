import { test, expect } from './game';

const ALL_TAPES = `JSON.stringify(Object.fromEntries(['dispatch-hold','passenger-hoyt','dispatch-empty','passenger-greenpoint','warning-time','conductor','mom-voice',
  'station-bedford','station-classon','station-flushing','station-newtown'].map((id) => [id, { first: 1, count: 1 }])))`;

const openCaseFiles = async (page: import('@playwright/test').Page, tab: RegExp) => {
  await page.getByRole('button', { name: /Case Files/ }).click();
  const files = page.getByRole('dialog', { name: 'Case Files & Career Archive' });
  await files.getByRole('button', { name: tab }).click();
  return files;
};

test.describe('Case Files keep secrets', () => {
  test('unreached endings are redacted, locked badges don’t say how to earn them, and the secret one has no name', async ({ page, game }) => {
    await game(`localStorage.setItem('gtrain-endings', JSON.stringify({ civilian_extraction: { id: 'civilian_extraction', discoveredAt: 1, count: 1 } }));
      localStorage.setItem('gtrain-achievements', JSON.stringify({ first_anomaly: { unlockedAt: 1 } }));`);
    await page.goto('/');
    const files = await openCaseFiles(page, /Endings & Badges/);

    await expect(files.getByText('Civilian Extraction', { exact: true })).toBeVisible();
    await expect(files.getByText('Undocumented Outcome')).toHaveCount(7);
    for (const hidden of ['Midnight Terminal', 'Dawn Horizon', 'Skyward Catwalk', 'Eternal Commute', 'Unbroken Mask', 'UNBROKEN MASK', 'peak suspicion']) {
      await expect(files).not.toContainText(hidden);
    }
    // Earned badge: full text. Locked: name only. Secret and locked: no name.
    await expect(files).toContainText('Catch your first anomaly with a flag or Polaroid photo.');
    await expect(files.getByText('Signal Hunter')).toBeVisible();
    await expect(files).not.toContainText('Record at least 3 distinct radio signals');
    await expect(files.getByText('Not yet earned.')).toHaveCount(7);
    await expect(files.getByText('???', { exact: true })).toHaveCount(1);
  });
});

test.describe('Broadcasts', () => {
  for (const [route, expectTitles, absent] of [
    ['G', ['Bedford–Nostrand dispatch static', 'Classon Av phantom PA echo', 'Flushing Av night wiretap', 'Newtown Creek emergency channel'], []],
    ['L', ['1st Av dispatch static', '3rd Av phantom PA echo', 'Lorimer St night wiretap', 'Track emergency channel'], ['Bedford', 'Classon', 'Flushing Av', 'Newtown']],
  ] as const) {
    test(`titles and words name the ${route}’s stops, with no unfilled {tokens}`, async ({ page, game }) => {
      await game(`localStorage.setItem('gtrain-tapes', ${ALL_TAPES});`);
      await page.goto('/');
      await page.evaluate((r) => (window as any).__RT.setRoute(r), route);
      const files = await openCaseFiles(page, /Frequencies & Tapes/);
      for (const t of expectTitles) await expect(files.getByText(t, { exact: true })).toBeVisible();
      for (const a of absent) await expect(files).not.toContainText(a);
      await expect(files).not.toContainText('{');
      if (route === 'G') await expect(files).toContainText('relay failure at Bedford–Nostrand');
      else await expect(files).toContainText('relay failure at 1st Av');
    });
  }
});

test.describe('Passengers', () => {
  // Stand 2 m from a passenger and look straight at them (or away), stepping their gaze logic.
  const STARE = (tier: number, secs: number, away = false) => `
    const P = G.carBuilder.getAllPassengers().filter((x) => x.g && x.g.visible && !G.carBuilder.parents.includes(x))[0];
    const at = R.camera.position.clone(); P.g.getWorldPosition(at);
    const from = at.clone(); from.x += 2; from.y += 0.6;
    const dir = at.clone().sub(from).normalize(); if (${away}) dir.negate();
    for (let t = 0; t < ${secs}; t += 0.05) window.__PB.updatePassengers([P], from, dir, ${tier}, false, G.GT + t, 0.05);
    window.__STARED = P;
    return { eye: P.eyes[0].scale.x, avert: !!P.uncannyAvert, stare: P.stareT };`;

  test('at High sanity they only look away when stared at; their eyes never change', async ({ game }) => {
    const r = await game(STARE(0, 3));
    expect(r.eye).toBe(1);
    expect(r.avert).toBe(true);
  });

  test('from Medium down they meet a long stare with wider eyes, which go back to normal soon after you look away', async ({ game }) => {
    const staring = await game(STARE(1, 1.6));
    expect(staring.eye).toBeCloseTo(1.2, 5);
    const away = await game(`const P = window.__STARED; const at = R.camera.position.clone(); P.g.getWorldPosition(at);
      const from = at.clone(); from.x += 2; from.y += 0.6; const dir = at.clone().sub(from).normalize().negate();
      for (let t = 0; t < 1; t += 0.05) window.__PB.updatePassengers([P], from, dir, 1, false, G.GT + 5 + t, 0.05); return P.eyes[0].scale.x;`);
    expect(away).toBe(1);
  });
});

test.describe('Saved prints', () => {
  test('are kept as small thumbnails, newest first, at most 12, without private framing data; older full-size prints shrink too', async ({ game }) => {
    const r = await game(`
      // 15 full-size prints saved by an earlier build.
      const c = document.createElement('canvas'); c.width = c.height = 300; const x = c.getContext('2d');
      const img = x.createImageData(300, 300); for (let i = 0; i < img.data.length; i++) img.data[i] = (i * 2654435761) >>> 24;
      x.putImageData(img, 0, 0); const big = c.toDataURL('image/jpeg', 0.9);
      localStorage.setItem('gtrain-polaroids', JSON.stringify(Array.from({ length: 15 }, (_, i) => ({ id: 'old' + i, dataUrl: big, framed: [{ id: 'x', desc: 'secret' }] }))));
      ride(0); await sleep(300);
      const shots = []; for (let i = 0; i < 3; i++) { const p = G.takePolaroidPhoto(); if (p) shots.push(p.id); advance(1); }
      G.endGame();
      let kept = []; for (let i = 0; i < 100; i++) { await sleep(100); kept = JSON.parse(localStorage.getItem('gtrain-polaroids') || '[]'); if (kept.some((p) => p.id === shots[0])) break; }
      return { bigSize: big.length, shots, ids: kept.map((p) => p.id), maxSize: Math.max(...kept.map((p) => p.dataUrl.length)),
        framed: kept.reduce((n, p) => n + (p.framed?.length || 0), 0), total: (localStorage.getItem('gtrain-polaroids') || '').length };`);
    expect(r.bigSize).toBeGreaterThan(60_000);
    expect(r.ids.length).toBe(12);
    expect(r.ids.slice(0, 3).sort()).toEqual([...r.shots].sort());
    expect(r.maxSize).toBeLessThan(40_000);
    expect(r.framed).toBe(0);
    expect(r.total).toBeLessThan(500_000);
  });
});
