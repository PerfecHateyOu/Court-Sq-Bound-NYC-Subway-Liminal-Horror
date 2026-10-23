import { test, expect, type Page } from '@playwright/test';
import { runner, SKIP_TUTORIAL } from './game';

// Every control is big enough to hit: at least 44×44 px on touch, 32×32 px with a mouse
// (the `tap` utility in index.css). A checkbox counts its whole label.

const CONTROLS = 'button, a[href], select, input:not([type=hidden]):not([type=checkbox]), [role=tab], [role=radio], label:has(input[type=checkbox])';

/** Visible controls smaller than `min` in either direction, with a name to find them by. */
async function undersized(page: Page, min: number, scope = 'body') {
  return page.evaluate(
    async ({ sel, min, scope }) => {
      // Measure panels at rest, not mid-way through their opening animation (src/ui/Overlay.tsx).
      await Promise.all(
        document.getAnimations().filter((a) => /^overlay-/.test((a as CSSAnimation).animationName)).map((a) => a.finished)
      );
      const root = document.querySelector(scope) || document.body;
      const out: string[] = [];
      for (const el of root.querySelectorAll<HTMLElement>(sel)) {
        const r = el.getBoundingClientRect();
        if (!r.width || !r.height) continue; // not rendered
        const cs = getComputedStyle(el);
        if (cs.visibility === 'hidden' || cs.pointerEvents === 'none' || el.closest('[aria-hidden=true],[inert]')) continue;
        if (r.width + 0.5 < min || r.height + 0.5 < min) {
          const name = (el.getAttribute('aria-label') || el.textContent || el.tagName).trim().replace(/\s+/g, ' ').slice(0, 40);
          out.push(`${name} ${Math.round(r.width)}×${Math.round(r.height)}`);
        }
      }
      return out;
    },
    { sel: CONTROLS, min, scope }
  );
}

const SIZES = [
  { name: 'phone (touch)', viewport: { width: 390, height: 844 }, touch: true, min: 44 },
  { name: 'phone landscape (touch)', viewport: { width: 844, height: 390 }, touch: true, min: 44 },
  { name: 'desktop', viewport: { width: 1280, height: 720 }, touch: false, min: 32 },
];

for (const s of SIZES) {
  test.describe(s.name, () => {
    test.use({ viewport: s.viewport, hasTouch: s.touch, isMobile: s.touch });

    test('title, Settings and Case Files', async ({ page }) => {
      await page.addInitScript(SKIP_TUTORIAL);
      await page.goto('/');
      await page.evaluate(() => localStorage.setItem('gtrain-runs', JSON.stringify([{ date: 1, san: 50, sanPct: 50, peak: 1, acc: { correct: 0, miss: 0, fp: 0 }, trials: 0 }])));
      await page.reload();
      expect(await undersized(page, s.min), 'title').toEqual([]);
      await page.getByRole('button', { name: 'Settings' }).click();
      expect(await undersized(page, s.min, '[role=dialog]'), 'Settings').toEqual([]);
      await page.keyboard.press('Escape');
      await page.getByRole('button', { name: /Case Files/ }).click();
      expect(await undersized(page, s.min, '[role=dialog]'), 'Case Files').toEqual([]);
    });

    test('in the ride: HUD, practice coach, a choice, Pause, Evidence Log, report', async ({ page }) => {
      await page.goto('/');
      await page.evaluate(() => {
        localStorage.clear();
        localStorage.setItem('gtrain-settings', JSON.stringify({ fullscreenOnBoard: false }));
      });
      await page.reload();
      await page.getByRole('button', { name: 'Board the Train' }).click();
      await page.waitForFunction(() => (window as any).__G?.phase !== 'menu');
      const game = runner(page);
      await page.waitForTimeout(300);
      expect(await undersized(page, s.min), 'HUD with the practice coach').toEqual([]);
      await game(`G.finishTutorial(true); ride(2); G.Q = []; G.seg._masks = []; advance(1); G.startMaskCheck(); advance(0.2);`);
      expect(await undersized(page, s.min), 'a choice').toEqual([]);
      await game(`G.pickChoiceIndex(0); advance(4); G.pause();`);
      await page.waitForTimeout(200);
      expect(await undersized(page, s.min, '[role=dialog]'), 'Pause').toEqual([]);
      await game(`G.resume(); window.__P.setAlbum(true);`);
      await page.waitForTimeout(300);
      expect(await undersized(page, s.min, '[role=dialog]'), 'Evidence Log').toEqual([]);
      await game(`window.__P.setAlbum(false); ride(7); G.Q = []; advance(2); G.peak = 0; G.finalExitChoice = 'escalators'; G.endGame(); advance(0.3);`);
      await page.waitForTimeout(800);
      expect(await undersized(page, s.min), 'report').toEqual([]);
    });
  });
}
