/**
 * Shared test setup: boots a ride and runs scripts against the engine inside the page.
 *
 * Scripts get these helpers:
 *   G, A, R      engine, audio engine, { renderer, scene, camera, glitchPass }
 *   sleep(ms)    real time, for anything that needs rendered frames or audio
 *   advance(s)   steps the game clock directly, for logic that only depends on game time
 *                (much faster than waiting: software WebGL runs the game at ~1/3 speed)
 *   toTier(san, tier), ride(segment), flag(targetId), key(code)
 */
import { test as base, expect, type Page } from '@playwright/test';

const PRELUDE = `
const G = window.__G, A = window.__A, R = window.__R;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const advance = (s, dt = 0.05) => { for (let t = 0; t < s - 1e-9; t += dt) G.update(dt); };
const toTier = (san, tier) => {
  G.san = san; advance(0.05);
  if (G.tier !== tier) throw new Error('sanity ' + san + ' gave tier ' + G.tier + ', wanted ' + tier);
};
const waitGT = async (s) => { const g0 = G.GT; while (G.GT - g0 < s) await sleep(30); };
const ride = (i = 0) => { G.Q = []; G.startSegment(i); G.active.forEach((a) => (a.trigger = 999)); G.ty = 0.25; };
const flag = (tid) => {
  G.flagHeld = false; G.updateFlag(0.05);
  G.flagHeld = true; G.flagTid = null; G.flagProg = 0; G.flagLock = false;
  for (let i = 0; i < 20; i++) { G.gazeTid = tid; G.updateFlag(0.05); }
  G.flagHeld = false; G.updateFlag(0.05);
};
const key = (code) => window.dispatchEvent(new KeyboardEvent('keydown', { code }));
`;

export type Run = <T = any>(script: string) => Promise<T>;

export function runner(page: Page): Run {
  return (script) => page.evaluate(`(async () => {${PRELUDE}\n${script}\n})()`);
}

/** Load the game with fresh storage (unless told otherwise) and board the train. */
export async function board(page: Page, opts: { keepStorage?: boolean } = {}): Promise<Run> {
  await page.goto('/');
  if (!opts.keepStorage) {
    await page.evaluate(() => localStorage.clear());
  }
  // Boarding goes full screen by default; the suite plays windowed (resizing the viewport
  // would leave full screen and pause). e2e/fullscreen.spec.ts covers full screen itself.
  await page.evaluate(() => {
    const k = 'gtrain-settings';
    const s = JSON.parse(localStorage.getItem(k) || '{}');
    if (!('fullscreenOnBoard' in s)) localStorage.setItem(k, JSON.stringify({ ...s, fullscreenOnBoard: false }));
  });
  await page.reload();
  await page.locator('text=/Board the train/i').click();
  await page.waitForFunction(() => {
    const w = window as any;
    return w.__G && w.__A && w.__R && w.__G.phase !== 'menu';
  });
  return runner(page);
}

/** Collects page errors and fails the test if any occurred. */
export function watchErrors(page: Page): string[] {
  const errs: string[] = [];
  page.on('pageerror', (e) => errs.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error' && !/404|net::ERR_/.test(m.text())) errs.push(m.text());
  });
  return errs;
}

export const test = base.extend<{ pageErrors: string[]; game: Run }>({
  pageErrors: [
    async ({ page }, use) => {
      const errs = watchErrors(page);
      await use(errs);
      expect(errs, 'page errors').toEqual([]);
    },
    { auto: true },
  ],
  game: async ({ page }, use) => {
    await use(await board(page));
  },
});

export { expect };
