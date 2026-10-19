import { test, expect } from './game';
import type { Page } from '@playwright/test';

// The start screen: on laptops, desktops and phones turned sideways, Board the Train is on screen
// without scrolling (two columns: title, sign and button on the left, the briefing on the right).
// Phones held upright keep one column and scroll to it.

const A_RUN = JSON.stringify([{ date: 1, san: 50, sanPct: 50, peak: 10, acc: { correct: 1, miss: 1, fp: 0 }, trials: 0 }]);

async function open(page: Page, unlocked: boolean) {
  await page.goto('/');
  await page.evaluate((runs) => {
    localStorage.clear();
    localStorage.setItem('gtrain-settings', JSON.stringify({ fullscreenOnBoard: false }));
    if (runs) localStorage.setItem('gtrain-runs', runs);
  }, unlocked ? A_RUN : null);
  await page.reload();
}

/** Nothing spills sideways: no page scroll, and the title and station name fit their boxes. */
async function expectNoSidewaysOverflow(page: Page) {
  const r = await page.evaluate(() => {
    const fits = (el: Element | null) => !!el && el.scrollWidth <= el.clientWidth + 1;
    return {
      page: document.documentElement.scrollWidth <= innerWidth,
      title: fits(document.querySelector('h1')),
      station: fits(document.querySelector('h2')),
    };
  });
  expect(r).toEqual({ page: true, title: true, station: true });
}

const IN_VIEW = [
  [1280, 720],
  [1280, 800],
  [1366, 768],
  [1024, 768],
  [844, 390],
  [640, 360],
] as const;

for (const [width, height] of IN_VIEW) {
  test.describe(`${width}×${height}`, () => {
    test.use({ viewport: { width, height }, hasTouch: width < 1000, isMobile: width < 1000 });

    for (const unlocked of [false, true]) {
      test(`Board the Train is on screen without scrolling${unlocked ? ' (chapter select unlocked)' : ''}`, async ({ page }) => {
        await open(page, unlocked);
        const board = page.getByRole('button', { name: 'Board the Train' });
        await expect(board).toBeVisible();
        const b = (await board.boundingBox())!;
        expect(b.y, 'top on screen').toBeGreaterThanOrEqual(0);
        expect(b.y + b.height, 'bottom on screen').toBeLessThanOrEqual(height + 0.5);
        expect(await page.evaluate(() => document.querySelector('.safe-pad')!.scrollTop)).toBe(0);
        // The briefing sits beside it, not below.
        const brief = (await page.getByText(/with your parents/).boundingBox())!;
        expect(brief.x).toBeGreaterThan(b.x + b.width - 1);
        await expectNoSidewaysOverflow(page);
        if (unlocked) await expect(page.getByLabel('Start from')).toBeVisible();
      });
    }
  });
}

test.describe('390×844 (phone held upright)', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  test('one column, briefing first, and Board the Train is a scroll away', async ({ page }) => {
    await open(page, false);
    const board = page.getByRole('button', { name: 'Board the Train' });
    const brief = (await page.getByText(/with your parents/).boundingBox())!;
    await board.scrollIntoViewIfNeeded();
    const b = (await board.boundingBox())!;
    expect(b.y + b.height).toBeLessThanOrEqual(844 + 0.5);
    expect(Math.abs(brief.x - b.x)).toBeLessThan(40); // stacked, same column
    await expectNoSidewaysOverflow(page);
  });
});
