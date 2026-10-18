import { test, expect, type Page } from '@playwright/test';
import { board } from './game';

// Phones (part of #39): on-screen controls must not overlap, must stay out of the notch and home
// indicator, and dialogs must fit (or scroll) on a short landscape screen.

const PHONES = [
  // A notched phone in landscape (full screen / home-screen app draws under the notch).
  { name: 'notched phone, landscape', width: 852, height: 393, insets: { top: 0, right: 59, bottom: 21, left: 59 } },
  // A small phone in landscape, and in portrait.
  { name: 'small phone, landscape', width: 667, height: 375, insets: { top: 0, right: 0, bottom: 0, left: 0 } },
  { name: 'small phone, portrait', width: 375, height: 667, insets: { top: 20, right: 0, bottom: 0, left: 0 } },
];

type Box = { label: string; left: number; top: number; right: number; bottom: number };

/** The visible, clickable controls inside `root` (default: the whole page). */
async function controls(page: Page, root = 'body'): Promise<Box[]> {
  return page.evaluate((root) => {
    const scope = document.querySelector(root);
    if (!scope) return [];
    return [...scope.querySelectorAll<HTMLElement>('button, [role=button], select, input')]
      .filter((el) => {
        const r = el.getBoundingClientRect();
        const cs = getComputedStyle(el);
        return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.pointerEvents !== 'none' && !el.closest('[aria-hidden=true]');
      })
      .map((el) => {
        const r = el.getBoundingClientRect();
        const label = (el.getAttribute('aria-label') || el.textContent || el.tagName).trim().replace(/\s+/g, ' ').slice(0, 40);
        return { label, left: r.left, top: r.top, right: r.right, bottom: r.bottom };
      });
  }, root);
}

function overlaps(boxes: Box[]): string[] {
  const out: string[] = [];
  for (let i = 0; i < boxes.length; i++)
    for (let j = i + 1; j < boxes.length; j++) {
      const a = boxes[i], b = boxes[j];
      const w = Math.min(a.right, b.right) - Math.max(a.left, b.left);
      const h = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
      if (w > 1 && h > 1) out.push(`${a.label} overlaps ${b.label}`);
    }
  return out;
}

function outsideSafeArea(boxes: Box[], vp: (typeof PHONES)[number]): string[] {
  const { insets: s, width, height } = vp;
  return boxes
    .filter((b) => b.left < s.left - 0.5 || b.top < s.top - 0.5 || b.right > width - s.right + 0.5 || b.bottom > height - s.bottom + 0.5)
    .map((b) => `${b.label} at ${[b.left, b.top, b.right, b.bottom].map(Math.round).join(',')}`);
}

for (const vp of PHONES) {
  test.describe(vp.name, () => {
    test.use({ viewport: { width: vp.width, height: vp.height }, hasTouch: true, isMobile: true });

    test.beforeEach(async ({ page }) => {
      // Simulate the notch / home indicator (env(safe-area-inset-*)).
      const cdp = await page.context().newCDPSession(page);
      await cdp.send('Emulation.setSafeAreaInsetsOverride' as never, { insets: vp.insets } as never);
    });

    test('the HUD’s controls don’t overlap and stay in the safe area', async ({ page }) => {
      const game = await board(page);
      // Mid-ride with Dad's recorder: the fullest the top bar gets. A long station name too.
      await game(`ride(1); window.__EVP.hasRecorder = true; G.notifyUI();`); // to Clinton–Washington Avs
      await expect(page.getByRole('button', { name: 'Recorder' })).toBeVisible();
      const hud = await controls(page);
      expect(overlaps(hud)).toEqual([]);
      expect(outsideSafeArea(hud, vp)).toEqual([]);
      // The next stop still reads (truncated if it must be, never hidden behind a button).
      await expect(page.getByTestId('hud-route-panel')).toContainText('Clinton');

      // An answer prompt sits inside the safe area too.
      await game(`G.presentChoice({ items: [{ txt: 'Nothing. Just tired.', val: 'a' }, { txt: 'Did you see that?', val: 'b' }, { txt: 'Stay quiet.', val: 'c' }], window: 99, onPick: () => {} });`);
      await expect(page.getByRole('button', { name: /Stay quiet/ })).toBeVisible();
      expect(outsideSafeArea(await controls(page), vp)).toEqual([]);
    });

    test('the camera viewfinder’s controls stay in the safe area and clear of the touch controls', async ({ page }) => {
      const game = await board(page);
      await game(`ride(1); window.__P.toggleViewfinder(); G.notifyUI();`);
      await expect(page.getByRole('button', { name: 'Lower Camera' })).toBeVisible();
      const boxes = await controls(page);
      expect(boxes.map((b) => b.label)).not.toContain('FLAGhold to catch');
      expect(overlaps(boxes)).toEqual([]);
      expect(outsideSafeArea(boxes, vp)).toEqual([]);
    });

    test('the route selector fits: its title and close button are on screen, and the lines scroll', async ({ page }) => {
      const game = await board(page);
      await game(`ride(1);`);
      await page.getByTestId('hud-route-panel').click();
      const dialog = page.getByRole('dialog', { name: 'MTA Transit Line Switching' });
      await expect(dialog.getByRole('heading', { name: 'MTA Transit Line Switching' })).toBeInViewport();
      expect(outsideSafeArea(await controls(page, '[role=dialog]'), vp).filter((s) => s.startsWith('Close'))).toEqual([]);
      const last = dialog.getByRole('button', { name: /^7 Ghost Line/ });
      await last.scrollIntoViewIfNeeded();
      await expect(last).toBeInViewport();
      await dialog.getByRole('button', { name: 'Close route selector' }).click();
      await expect(dialog).toHaveCount(0);
    });

    test('the pause menu fits, or scrolls, and its buttons are reachable', async ({ page }) => {
      const game = await board(page);
      await game(`ride(1); G.pause();`);
      const restart = page.getByRole('button', { name: /Restart Ride/ });
      await restart.scrollIntoViewIfNeeded();
      await expect(restart).toBeInViewport();
      await expect(page.getByText('Train Paused')).toBeVisible();
    });
  });
}
