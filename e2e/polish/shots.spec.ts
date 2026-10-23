import { test, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { runner } from '../game';

// The polish pass's screenshot matrix: every screen at every viewport.
//   POLISH_OUT=../docs/polish/before npx playwright test -c polish.config.ts
const OUT = process.env.POLISH_OUT || '../docs/polish/shots';

const VIEWPORTS: Array<{ name: string; w: number; h: number; touch: boolean }> = [
  { name: '1920x1080', w: 1920, h: 1080, touch: false },
  { name: '1440x900', w: 1440, h: 900, touch: false },
  { name: '1280x720', w: 1280, h: 720, touch: false },
  { name: '1024x768', w: 1024, h: 768, touch: true },
  { name: '768x1024', w: 768, h: 1024, touch: true },
  { name: '390x844', w: 390, h: 844, touch: true },
  { name: '360x740', w: 360, h: 740, touch: true },
  { name: '844x390', w: 844, h: 390, touch: true },
  { name: '740x360', w: 740, h: 360, touch: true },
];

async function fresh(page: Page, tutorialSeen = true) {
  await page.goto('/');
  await page.evaluate((seen) => {
    localStorage.clear();
    localStorage.setItem('gtrain-settings', JSON.stringify({ fullscreenOnBoard: false }));
    if (seen) localStorage.setItem('gtrain-tutorial', 'done');
  }, tutorialSeen);
  await page.reload();
  await page.waitForTimeout(900);
}
async function board(page: Page) {
  await page.evaluate(() => [...document.querySelectorAll('button')].find((b) => /Board the Train/i.test(b.textContent || ''))!.click());
  await page.waitForFunction(() => (window as any).__G?.phase !== 'menu');
  return runner(page);
}
const clickText = (page: Page, re: RegExp) =>
  page.evaluate((src) => {
    const r = new RegExp(src, 'i');
    const b = [...document.querySelectorAll('button,[role=tab]')].find((x) => r.test((x.textContent || '').trim()));
    if (!b) throw new Error('no button ' + src);
    (b as HTMLElement).click();
  }, re.source);

for (const vp of VIEWPORTS) {
  test.describe(vp.name, () => {
    test.use({ viewport: { width: vp.w, height: vp.h }, hasTouch: vp.touch, isMobile: vp.touch });
    const dir = join(OUT, vp.name);
    const shot = (page: Page, name: string) => page.screenshot({ path: join(dir, `${name}.png`) });

    test('menus', async ({ page }) => {
      mkdirSync(dir, { recursive: true });
      await fresh(page);
      await shot(page, '01-title');
      await clickText(page, /^Settings$/);
      await page.waitForTimeout(400);
      await shot(page, '02-settings');
      await page.keyboard.press('Escape');
      await page.waitForTimeout(300);
      await clickText(page, /^Case Files/);
      await page.waitForTimeout(400);
      await shot(page, '03-casefiles-anomalies');
      for (const [re, n] of [[/^Polaroid/, '04-casefiles-polaroids'], [/^(Frequencies|Tapes)/, '05-casefiles-tapes'], [/^Endings/, '06-casefiles-endings']] as const) {
        await clickText(page, re);
        await page.waitForTimeout(250);
        await shot(page, n);
      }
    });

    test('in game', async ({ page }) => {
      mkdirSync(dir, { recursive: true });
      await fresh(page, false);
      let game = await board(page);
      await page.waitForTimeout(1500);
      await shot(page, '07-hud-tutorial');
      await fresh(page);
      game = await board(page);
      await game(`ride(2); G.Q = []; G.seg._masks = []; advance(2); G.startMaskCheck(); advance(0.3);`);
      await page.waitForTimeout(500);
      await shot(page, '08-hud-choice');
      await game(`G.choice && G.pickChoiceIndex(0); advance(4); G.pause();`);
      await page.waitForTimeout(500);
      await shot(page, '09-pause');
      await game(`G.resume ? G.resume() : (G.paused = false); window.__P.setAlbum(true);`);
      await page.waitForTimeout(500);
      await shot(page, '10-evidence-log');
      await game(`window.__P.setAlbum(false); ride(7); G.Q = []; advance(3); G.peak = 0; G.finalExitChoice = 'escalators'; G.endGame(); advance(0.3);`);
      await page.waitForTimeout(1200);
      await shot(page, '11-travel-report');
    });
  });
}
