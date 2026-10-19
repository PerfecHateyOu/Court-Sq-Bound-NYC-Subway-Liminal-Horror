import { test, expect } from './game';

// Part of #39, section 4 (Gameplay Flow and Consistency).

test.describe('Ending a ride and leaving the tab', () => {
  test('the camera and evidence log close when the ride ends, so the report is never covered', async ({ page, game }) => {
    await game(`ride(6); window.__P.setViewfinder(true); G.peak = 5; G.finalExitChoice = 'escalators'; G.endGame();`);
    expect(await game(`return [window.__P.isViewfinderOpen, window.__P.isAlbumOpen];`)).toEqual([false, false]);
    await game(`G.startIntro(); ride(6); window.__P.setAlbum(true); G.peak = 5; G.finalExitChoice = 'escalators'; G.endGame();`);
    expect(await game(`return [window.__P.isViewfinderOpen, window.__P.isAlbumOpen];`)).toEqual([false, false]);
    // The report's own buttons can be pressed.
    await page.getByRole('button', { name: /Ride Again|Get back on/ }).first().click();
    await expect.poll(() => game(`return G.phase;`)).toBe('intro');
  });

  test('hiding the tab on the report stops a playing tape and quiets the audio; coming back wakes it', async ({ page, game }) => {
    await game(`ride(6); window.__EVP.tapes.push({ signalId: 'passenger-hoyt', title: 'A passenger', stop: '7', freq: '1', transcript: 'x', gt: 1 });
      G.peak = 5; G.finalExitChoice = 'escalators'; G.endGame();`);
    await page.getByRole('button', { name: 'Play tape: A passenger' }).click();
    expect(await game(`return !!G.tapePlaying;`)).toBe(true);
    const hide = (hidden: boolean) =>
      page.evaluate((hidden) => {
        Object.defineProperty(document, 'hidden', { configurable: true, get: () => hidden });
        document.dispatchEvent(new Event('visibilitychange'));
      }, hidden);
    await hide(true);
    expect(await game(`return !!G.tapePlaying;`)).toBe(false);
    await expect.poll(() => game(`return window.__A.ac.state;`)).toBe('suspended');
    await hide(false);
    await expect.poll(() => game(`return window.__A.ac.state;`)).toBe('running');
    expect(await game(`return [G.phase, G.paused];`)).toEqual(['end', false]); // still on the report
  });
});

test.describe('Screen effects: Reduced, set in the game', () => {
  test('stops the flickering sign and pulsing-light animations, and softens the camera flash', async ({ page, game }) => {
    await game(`window.__S.set({ screenEffects: 'reduced' }); ride(6); G.pause();`);
    expect(await page.evaluate(() => document.documentElement.dataset.effects)).toBe('reduced');
    const animation = (sel: string) => page.locator(sel).first().evaluate((el) => getComputedStyle(el).animationName);
    expect(await animation('.transit-sign-header')).toBe('none');
    expect(await animation('.animate-pulse')).toBe('none');
    await game(`G.resume(); window.__P.setViewfinder(true); G.takePolaroidPhoto(); G.notifyUI();`);
    await expect(page.getByTestId('camera-flash')).toHaveClass(/bg-white\/25/);

    // "Always on" brings them back, even if the device asks for reduced motion.
    await game(`window.__S.set({ screenEffects: 'full' }); G.pause();`);
    expect(await page.evaluate(() => document.documentElement.dataset.effects)).toBe('full');
    expect(await animation('.transit-sign-header')).not.toBe('none');
  });
});

test.describe('Screen effects: Match device, on a device that asks for reduced motion', () => {
  test.use({ contextOptions: { reducedMotion: 'reduce' } });
  test('follows the device', async ({ page, game }) => {
    await game(`window.__S.set({ screenEffects: 'system' }); ride(6); G.pause();`);
    expect(await page.evaluate(() => document.documentElement.dataset.effects)).toBe('reduced');
    expect(await page.locator('.transit-sign-header').first().evaluate((el) => getComputedStyle(el).animationName)).toBe('none');
  });
});
