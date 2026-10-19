import { test, expect } from './game';
import type { Locator } from '@playwright/test';

// Selected, active and disabled states are visible (not just text that icon-only buttons hide)
// and announced.

const opacity = (el: Locator) => el.evaluate((e) => Number(getComputedStyle(e).opacity));

test.describe('HUD toggles on a phone (icon-only buttons)', () => {
  test.use({ viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true });

  test('the camera and recorder dim as a whole while a prompt keeps your hands busy', async ({ page, game }) => {
    await game(`window.__EVP.hasRecorder = true; ride(2); G.seg._masks = []; G.notifyUI();`);
    const camera = page.getByRole('button', { name: 'Polaroid Camera' });
    const recorder = page.getByRole('button', { name: 'Recorder' });
    expect(await opacity(camera)).toBe(1);
    expect(await opacity(recorder)).toBe(1);

    await game(`G.startMaskCheck(); G.notifyUI();`);
    await expect(camera).toHaveAttribute('aria-disabled', 'true');
    await expect(recorder).toHaveAttribute('aria-disabled', 'true');
    await expect.poll(() => opacity(camera)).toBeLessThanOrEqual(0.5);
    await expect.poll(() => opacity(recorder)).toBeLessThanOrEqual(0.5);

    await game(`G.pickChoiceIndex(0); G.notifyUI();`);
    await expect(camera).not.toHaveAttribute('aria-disabled', 'true');
    await expect.poll(() => opacity(camera)).toBe(1);
  });

  test('camera, recorder and album say when they are on; Mute shows its ring', async ({ page, game }) => {
    await game(`window.__EVP.hasRecorder = true; ride(2); G.seg._masks = []; G.notifyUI();`);
    const album = page.getByRole('button', { name: 'Evidence Album' });
    await expect(page.getByRole('button', { name: 'Polaroid Camera' })).toHaveAttribute('aria-pressed', 'false');
    await expect(album).toHaveAttribute('aria-pressed', 'false');

    await game(`G.toggleRecorder();`);
    await expect(page.locator('button[aria-label="Recorder"][aria-pressed]')).toHaveAttribute('aria-pressed', 'true'); // the HUD's (the raised recorder has its own)
    await game(`G.toggleRecorder(); window.__P.setAlbum(true);`);
    await expect(album).toHaveAttribute('aria-pressed', 'true');
    await game(`window.__P.setAlbum(false);`);

    const mute = page.getByRole('button', { name: 'Mute' });
    const border = () => mute.evaluate((e) => getComputedStyle(e).borderColor);
    const before = await border();
    await mute.click();
    const unmute = page.getByRole('button', { name: 'Unmute' });
    await expect(unmute).toBeVisible();
    // (The colour eases in, so wait for it.)
    await expect.poll(() => unmute.evaluate((e) => getComputedStyle(e).borderColor)).not.toBe(before);
  });
});

test('the album’s filter chips say which one is selected', async ({ page, game }) => {
  await game(`ride(2); window.__P.setAlbum(true);`);
  const all = page.getByRole('button', { name: /^All Prints/ });
  const carB = page.getByRole('button', { name: /^Car B/ });
  await expect(all).toHaveAttribute('aria-pressed', 'true');
  await expect(carB).toHaveAttribute('aria-pressed', 'false');
  await carB.click();
  await expect(carB).toHaveAttribute('aria-pressed', 'true');
  await expect(all).toHaveAttribute('aria-pressed', 'false');
});
