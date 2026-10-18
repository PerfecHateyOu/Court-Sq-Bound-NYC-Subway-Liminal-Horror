import { devices } from '@playwright/test';
import { test, expect, board } from './game';

const STICK = '[data-testid=move-stick]';
// Drag inside the stick with a touch pointer, holding it there; returns its centre.
const PRESS = (id: number, dx: number, dy: number) => `{ const st = document.querySelector('${STICK}'); const r = st.getBoundingClientRect();
  const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
  const ev = (type, x, y) => st.dispatchEvent(new PointerEvent(type, { pointerId: ${id}, pointerType: 'touch', isPrimary: true, clientX: x, clientY: y, bubbles: true, cancelable: true }));
  ev('pointerdown', cx, cy); for (let i = 1; i <= 5; i++) ev('pointermove', cx + ${dx} * i / 5, cy + ${dy} * i / 5);
  window.__stickUp = () => ev('pointerup', cx + ${dx}, cy + ${dy}); }`;

test.describe('walking on a phone', () => {
  const { defaultBrowserType: _ignored, ...pixel } = devices['Pixel 7'];
  test.use({ ...pixel, viewport: { width: 915, height: 412 } }); // landscape

  test('the WALK stick walks the player, analog, and stops on release', async ({ page }) => {
    const game = await board(page);
    await game(`ride(0); await sleep(300);`);
    await expect(page.locator(STICK)).toBeVisible();
    // Push straight up (forward) to full travel.
    const full = await game(`${PRESS(11, 0, -60)} await sleep(50); const x0 = G.eyePos.x, z0 = G.eyePos.z; const f = G.moveFwd, r = G.moveRight;
      await waitGT(0.5); const moved = Math.hypot(G.eyePos.x - x0, G.eyePos.z - z0); window.__stickUp(); await sleep(50);
      return { f, r, moved, after: [G.moveFwd, G.moveRight] };`);
    expect(full.f).toBeCloseTo(1, 2);
    expect(Math.abs(full.r)).toBeLessThan(0.01);
    expect(full.moved).toBeGreaterThan(0.5); // ~2.4 m/s
    expect(full.after).toEqual([0, 0]);
    // Half push to the right: slower, sideways.
    const half = await game(`${PRESS(12, 24, 0)} await sleep(50); const v = [G.moveFwd, G.moveRight]; window.__stickUp(); return v;`);
    expect(Math.abs(half[0])).toBeLessThan(0.01);
    expect(half[1]).toBeGreaterThan(0.4);
    expect(half[1]).toBeLessThan(0.7);
    // A thumb resting near the centre doesn't creep.
    const rest = await game(`${PRESS(13, 5, -4)} await sleep(50); const v = [G.moveFwd, G.moveRight]; window.__stickUp(); return v;`);
    expect(rest).toEqual([0, 0]);
  });

  test('one thumb walks while the other drags to look', async ({ page }) => {
    const game = await board(page);
    const r = await game(`ride(0); await sleep(300); G.ty = 0; ${PRESS(21, 0, -60)}
      const c = R.renderer.domElement; const ev = (type, x) => c.dispatchEvent(new PointerEvent(type, { pointerId: 22, pointerType: 'touch', clientX: x, clientY: 200, bubbles: true }));
      ev('pointerdown', 600); for (let i = 1; i <= 10; i++) ev('pointermove', 600 - 6 * i); ev('pointerup', 540);
      const out = { fwd: G.moveFwd, ty: G.ty }; window.__stickUp(); return out;`);
    expect(r.fwd).toBeCloseTo(1, 2);
    expect(r.ty).toBeGreaterThan(0.2); // the look drag still turned the view
  });

  test('hidden during answer prompts and the restraint; pausing stops walking', async ({ page }) => {
    const game = await board(page);
    await game(`ride(0); await sleep(300);`);
    const stick = page.locator(STICK);
    await expect(stick).toBeVisible();
    await game(`G.choice = { items: [{ txt: 'a', val: 0 }], window: 1e9, left: 1e9, gT: 0, glitch: 0, keyMap: [0], onPick: () => {} }; G.notifyUI && G.notifyUI(); await sleep(400);`);
    await expect(stick).toHaveCount(0);
    await game(`G.choice = null; G.notifyUI && G.notifyUI(); await sleep(400);`);
    await expect(stick).toBeVisible();
    // Hold the stick, then pause: walking stops, and doesn't resume after unpausing.
    await game(`${PRESS(31, 0, -60)} await sleep(50);`);
    expect(await game(`return G.moveFwd`)).toBeCloseTo(1, 2);
    await page.getByRole('button', { name: 'Pause' }).click();
    expect(await game(`await sleep(300); return [G.paused, G.moveFwd];`)).toEqual([true, 0]);
    await expect(stick).toHaveCount(0);
    await page.getByRole('button', { name: /Resume/ }).click();
    expect(await game(`await sleep(300); const x = G.eyePos.x; await waitGT(0.3); return [G.moveFwd, G.eyePos.x - x];`)).toEqual([0, 0]);
    await expect(stick).toBeVisible();
  });
});

test.describe('walking on desktop', () => {
  test('no stick; the keyboard hints show instead', async ({ page }) => {
    await page.setViewportSize({ width: 1200, height: 700 });
    const game = await board(page);
    await game(`ride(0); await sleep(300);`);
    await expect(page.locator(STICK)).toHaveCount(0);
    await expect(page.getByText('[W][A][S][D] WALK')).toBeVisible();
  });
});
