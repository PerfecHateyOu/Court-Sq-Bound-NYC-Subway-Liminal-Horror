import { test, expect, type Page } from '@playwright/test';
import { board, SKIP_TUTORIAL } from './game';

// Every panel is the shared Overlay (src/ui/Overlay.tsx): never taller than the screen with its
// header and footer in view, a bottom sheet on touch phones held upright, Esc closes it and hands
// focus back, and its animation is off under Reduced screen effects.

/** The panel's box, the viewport, and whether its body scrolls. */
async function box(page: Page, testId: string) {
  return page.evaluate(async (id) => {
    // At rest, after the opening animation.
    await Promise.all(
      document.getAnimations().filter((a) => /^overlay-/.test((a as CSSAnimation).animationName)).map((a) => a.finished)
    );
    const el = document.querySelector<HTMLElement>(`[data-testid="${id}"]`)!;
    const r = el.getBoundingClientRect();
    const body = el.querySelector<HTMLElement>('.overlay-body')!;
    return {
      top: r.top,
      bottom: r.bottom,
      left: r.left,
      right: r.right,
      vw: innerWidth,
      vh: innerHeight,
      scrolls: body.scrollHeight > body.clientHeight + 1,
      animation: getComputedStyle(el).animationName,
    };
  }, testId);
}

async function openTitlePanels(page: Page) {
  await page.addInitScript(SKIP_TUTORIAL);
  await page.goto('/');
  await page.evaluate(() => localStorage.setItem('gtrain-runs', JSON.stringify([{ date: 1, san: 50, sanPct: 50, peak: 1, acc: { correct: 0, miss: 0, fp: 0 }, trials: 0 }])));
  await page.reload();
}

for (const s of [
  { name: 'phone (touch)', viewport: { width: 390, height: 844 }, touch: true, sheet: true },
  { name: 'phone landscape (touch)', viewport: { width: 844, height: 390 }, touch: true, sheet: false },
  { name: 'desktop', viewport: { width: 1280, height: 720 }, touch: false, sheet: false },
]) {
  test.describe(s.name, () => {
    test.use({ viewport: s.viewport, hasTouch: s.touch, isMobile: s.touch });

    test('Settings and Case Files fit the screen, header and footer in view', async ({ page }) => {
      await openTitlePanels(page);
      for (const [open, id, done] of [
        ['Settings', 'settings-panel', 'Done'],
        [/Case Files/, 'case-files', 'Close'],
      ] as const) {
        await page.getByRole('button', { name: open }).first().click();
        const b = await box(page, id);
        expect(b.top).toBeGreaterThanOrEqual(0);
        expect(b.bottom).toBeLessThanOrEqual(b.vh + 0.5);
        if (s.sheet) {
          // A bottom sheet: full width, flush with the bottom edge.
          expect(Math.round(b.bottom)).toBe(b.vh);
          expect(Math.round(b.right - b.left)).toBe(b.vw);
        } else {
          expect(b.bottom).toBeLessThan(b.vh);
        }
        await expect(page.getByTestId(id).getByRole('button', { name: done }).last()).toBeInViewport();
        await page.keyboard.press('Escape');
        await expect(page.getByTestId(id)).toHaveCount(0);
        // Focus is back on the button that opened it.
        await expect(page.getByRole('button', { name: open }).first()).toBeFocused();
      }
    });

    test('Pause and the Evidence Log fit the screen', async ({ page }) => {
      const game = await board(page);
      await game(`G.pause();`);
      await expect(page.getByTestId('pause-panel')).toBeVisible();
      let b = await box(page, 'pause-panel');
      expect(b.top).toBeGreaterThanOrEqual(0);
      expect(b.bottom).toBeLessThanOrEqual(b.vh + 0.5);
      await expect(page.getByRole('button', { name: 'Resume Ride' })).toBeFocused();
      await game(`G.resume(); window.__P.setAlbum(true);`);
      await expect(page.getByTestId('evidence-log')).toBeVisible();
      b = await box(page, 'evidence-log');
      expect(b.top).toBeGreaterThanOrEqual(0);
      expect(b.bottom).toBeLessThanOrEqual(b.vh + 0.5);
      await expect(page.getByRole('button', { name: 'Close Album' })).toBeInViewport();
    });
  });
}

test('Reduced screen effects: panels appear without animating', async ({ page }) => {
  await page.addInitScript(SKIP_TUTORIAL);
  await page.goto('/');
  await page.evaluate(() => localStorage.setItem('gtrain-settings', JSON.stringify({ screenEffects: 'reduced' })));
  await page.reload();
  await page.getByRole('button', { name: 'Settings' }).click();
  expect((await box(page, 'settings-panel')).animation).toBe('none');
  await page.keyboard.press('Escape');
  await page.evaluate(() => localStorage.setItem('gtrain-settings', JSON.stringify({ screenEffects: 'full' })));
  await page.reload();
  await page.getByRole('button', { name: 'Settings' }).click();
  expect((await box(page, 'settings-panel')).animation).not.toBe('none');
});
