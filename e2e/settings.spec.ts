import { test, expect, board } from './game';

const DIALOG = '[role=dialog][aria-labelledby=settings-title]';

test.describe('settings', () => {
  test('opens from the start screen; Done and Esc close it', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Settings' }).click();
    const d = page.locator(DIALOG);
    await expect(d).toBeVisible();
    await expect(d.getByLabel('Look speed')).toHaveValue('1');
    await expect(d.getByLabel('Game sounds')).toHaveValue('1');
    await expect(d.getByRole('radio', { name: 'Match device' })).toHaveAttribute('aria-checked', 'true');
    await d.getByRole('button', { name: 'Done' }).click();
    await expect(d).toHaveCount(0);
    await page.getByRole('button', { name: 'Settings' }).click();
    await page.keyboard.press('Escape');
    await expect(d).toHaveCount(0);
  });

  test('look speed scales dragging, and invert flips vertical look', async ({ page }) => {
    const game = await board(page);
    await game(`G.Q = [];`);
    // Touch-style pointer drag on the canvas (headless pointer lock sends erratic mouse deltas).
    const drag = (dx: number, dy: number) =>
      game<{ ty: number; tp: number }>(`G.ty = 0; G.tp = 0; const c = R.renderer.domElement; const x = 320, y = 180;
        const ev = (type, cx, cy) => c.dispatchEvent(new PointerEvent(type, { pointerId: 7, pointerType: 'touch', clientX: cx, clientY: cy, bubbles: true }));
        ev('pointerdown', x, y); for (let i = 1; i <= 10; i++) ev('pointermove', x + ${dx} * i / 10, y + ${dy} * i / 10); ev('pointerup', x + ${dx}, y + ${dy});
        return { ty: G.ty, tp: G.tp };`);
    const base = await drag(-40, -20);
    await page.evaluate(() => (window as any).__S.set({ lookSensitivity: 2 }));
    const fast = await drag(-40, -20);
    expect(base.ty).toBeCloseTo(40 * 0.0055, 4);
    expect(fast.ty / base.ty).toBeCloseTo(2, 3);
    expect(fast.tp / base.tp).toBeCloseTo(2, 3);
    await page.evaluate(() => (window as any).__S.set({ lookSensitivity: 1, invertY: true }));
    const inv = await drag(-40, -20);
    expect(inv.ty).toBeCloseTo(base.ty, 4);
    expect(inv.tp).toBeCloseTo(-base.tp, 4);
  });

  test('volume sliders in the pause menu change the game and music levels live, and persist', async ({ page }) => {
    const game = await board(page);
    await game(`ride(0);`);
    await page.keyboard.press('KeyP');
    await page.getByRole('button', { name: 'Settings' }).click();
    const d = page.locator(DIALOG);
    await d.getByLabel('Game sounds').fill('0.4');
    await d.getByLabel('Music', { exact: true }).fill('0.25');
    await expect(d.locator('output[for=set-game-vol]')).toHaveText('40%');
    const g = await game(`await sleep(400); return { game: A.gameVol.gain.value, music: A.musicVol.gain.value, duck: A.masterGain.gain.value };`);
    expect(g.game).toBeCloseTo(0.4, 2);
    expect(g.music).toBeCloseTo(0.25, 2);
    expect(g.duck).toBeLessThan(0.02); // pause ducking still works underneath

    // A new session starts at the saved levels.
    const g2 = await (await board(page, { keepStorage: true }))(`return { game: A.gameVol.gain.value, music: A.musicVol.gain.value };`);
    expect(g2.game).toBeCloseTo(0.4, 2);
    expect(g2.music).toBeCloseTo(0.25, 2);
  });

  test('Esc or P closes Settings and leaves the game paused; P then resumes', async ({ page }) => {
    const game = await board(page);
    await game(`ride(0);`);
    await page.keyboard.press('KeyP');
    for (const k of ['Escape', 'KeyP']) {
      await page.getByRole('button', { name: 'Settings' }).click();
      await expect(page.locator(DIALOG)).toBeVisible();
      await page.keyboard.press(k);
      await expect(page.locator(DIALOG)).toHaveCount(0);
      expect(await game(`return G.paused`)).toBe(true);
    }
    await page.keyboard.press('KeyP');
    expect(await game(`await sleep(200); return G.paused`)).toBe(false);
  });

  test('Reduced turns off glitch, breathing and the heartbeat animation mid-ride', async ({ page }) => {
    const game = await board(page);
    await game(`ride(0); toTier(5, 3); G.segFlags.push({ tid: 'x', gt: G.GT }); advance(9);`);
    await page.keyboard.press('KeyP');
    await page.getByRole('button', { name: 'Settings' }).click();
    await page.getByRole('radio', { name: 'Reduced' }).click();
    await page.getByRole('button', { name: 'Done' }).click();
    await page.keyboard.press('KeyP');
    const r = await game(`const gp = R.glitchPass; let n = 0; const o = gp.render.bind(gp); gp.render = (...a) => { n++; o(...a); };
      G.triggerGlitch('anomaly'); const f = []; for (let i = 0; i < 30; i++) { f.push(R.camera.fov); await sleep(40); }
      const c = document.querySelector('[data-testid=heartbeat-trace]'); const hash = () => { const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
        let h = 0; for (let i = 0; i < d.length; i += 7) h = (h * 31 + d[i]) | 0; return h; };
      await sleep(300); const h1 = hash(); await sleep(1000); const h2 = hash(); gp.render = o;
      return { calls: n, min: Math.min(...f), max: Math.max(...f), still: h1 === h2 };`);
    expect(r).toEqual({ calls: 0, min: 68, max: 68, still: true });
  });

  test('erasing saved progress asks first, then clears the log and ride history', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('gtrain-psychlog', JSON.stringify({ stare: { seen: 2, caught: 1, first: 1 } }));
      localStorage.setItem('gtrain-runs', JSON.stringify([{ date: 1, san: 50, sanPct: 50, peak: 3, acc: { correct: 1, miss: 0, fp: 0 }, trials: 0 }]));
      localStorage.setItem('gtrain-settings', JSON.stringify({ gameVolume: 0.5 }));
    });
    await page.getByRole('button', { name: 'Settings' }).click();
    const d = page.locator(DIALOG);
    await expect(d.getByText('Settings are kept.')).toBeVisible();
    await d.getByRole('button', { name: 'Erase saved progress' }).click();
    // The confirmation names exactly what will go, and what it relocks.
    await expect(d.getByTestId('erase-list').locator('li')).toHaveText(['1 finished ride', '1 Case Files entry']);
    await expect(d.locator('[role=alertdialog]')).toContainText('Nightmare mode and chapter select lock again');
    await expect(d.locator('[role=alertdialog]')).toContainText('Your settings are kept.');
    await d.locator('[role=alertdialog]').getByRole('button', { name: 'Cancel' }).click();
    expect(await page.evaluate(() => localStorage.getItem('gtrain-psychlog'))).not.toBeNull();
    await d.getByRole('button', { name: 'Erase saved progress' }).click();
    await d.locator('[role=alertdialog]').getByRole('button', { name: 'Erase' }).click();
    await expect(d.getByText('Saved progress erased.')).toBeVisible();
    const left = await page.evaluate(() => ({
      log: localStorage.getItem('gtrain-psychlog'), runs: localStorage.getItem('gtrain-runs'), settings: localStorage.getItem('gtrain-settings'),
    }));
    expect(left.log).toBeNull();
    expect(left.runs).toBeNull();
    expect(left.settings).not.toBeNull(); // settings are kept
  });

  test('the erase list counts everything saved; with nothing saved there’s nothing to erase', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.getByRole('button', { name: 'Settings' }).click();
    const d = page.locator(DIALOG);
    await expect(d.getByText('Nothing saved on this device yet.')).toBeVisible();
    await expect(d.getByRole('button', { name: 'Erase saved progress' })).toHaveCount(0);
    await d.getByRole('button', { name: 'Done' }).click();

    await page.evaluate(() => {
      const set = (k: string, v: unknown) => localStorage.setItem(k, JSON.stringify(v));
      set('gtrain-psychlog', { stare: { seen: 2, caught: 1, first: 1 }, adswap: { seen: 1, caught: 0, first: 1 } });
      set('gtrain-endings', { exposed: { id: 'exposed', discoveredAt: 1, count: 1 } });
      set('gtrain-tapes', { a: { first: 1, count: 1 }, b: { first: 1, count: 2 } });
      set('gtrain-polaroids', [{ id: 'p1' }, { id: 'p2' }, { id: 'p3' }]);
      set('gtrain-achievements', { first_anomaly: { unlockedAt: 1 } });
    });
    await page.getByRole('button', { name: 'Settings' }).click();
    await d.getByRole('button', { name: 'Erase saved progress' }).click();
    await expect(d.getByTestId('erase-list').locator('li')).toHaveText(['2 Case Files entries', '1 ending', '2 tapes', '3 prints', '1 badge']);
    // No finished rides saved, so nothing relocks.
    await expect(d.locator('[role=alertdialog]')).not.toContainText('lock again');
  });

  test('bad saved settings fall back to defaults', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.setItem('gtrain-settings', '{"lookSensitivity":99,"gameVolume":"loud","screenEffects":"strobe"'));
    await page.reload();
    await page.getByRole('button', { name: 'Settings' }).click();
    await expect(page.getByLabel('Look speed')).toHaveValue('1');
    await expect(page.getByRole('radio', { name: 'Match device' })).toHaveAttribute('aria-checked', 'true');
    await page.evaluate(() => localStorage.setItem('gtrain-settings', '{"lookSensitivity":99,"gameVolume":"loud","screenEffects":"strobe"}'));
    await page.reload();
    await page.getByRole('button', { name: 'Settings' }).click();
    await expect(page.getByLabel('Look speed')).toHaveValue('2'); // clamped to the top of the range
    await expect(page.getByLabel('Game sounds')).toHaveValue('1');
    await expect(page.getByRole('radio', { name: 'Match device' })).toHaveAttribute('aria-checked', 'true');
  });
});

test.describe('settings with reduced motion on the device', () => {
  test.use({ contextOptions: { reducedMotion: 'reduce' } });
  test('Full overrides the device setting', async ({ page }) => {
    const game = await board(page);
    await page.evaluate(() => (window as any).__S.set({ screenEffects: 'full' }));
    const r = await game(`ride(0); toTier(5, 3); const gp = R.glitchPass; let n = 0; const o = gp.render.bind(gp);
      gp.render = (...a) => { n++; o(...a); }; G.glitch = null; G.triggerGlitch('anomaly'); await waitGT(G.glitch.duration * 0.6); await sleep(100); gp.render = o; return n;`);
    expect(r).toBeGreaterThan(0);
  });
});

test.describe('settings on a phone', () => {
  test.use({ viewport: { width: 375, height: 667 }, hasTouch: true, isMobile: true });
  test('fits without sideways scrolling', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Settings' }).click();
    const d = page.locator(DIALOG);
    await expect(d).toBeVisible();
    const box = (await d.boundingBox())!;
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(375);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);
    await d.getByRole('button', { name: 'Done' }).scrollIntoViewIfNeeded();
    await expect(d.getByRole('button', { name: 'Done' })).toBeInViewport();
  });
});
