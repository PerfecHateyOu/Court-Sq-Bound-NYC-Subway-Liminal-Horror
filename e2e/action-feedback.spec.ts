import { test, expect } from './game';

// Part of #39 (Player Feedback): actions that can't happen say so, and a double tap or a held key
// doesn't fire twice. Flags stay private: nothing here hints at whether a flag or a photo caught anything.

test.describe('Action feedback', () => {
  test('the shutter fires once per press: a held key or a quick second tap waits for the print to eject', async ({ page, game }) => {
    await game(`ride(0); window.__P.setViewfinder(true); G.notifyUI();`);
    const film0 = await game(`return window.__P.remainingFilm;`);
    const shutter = page.getByTestId('shutter');
    await expect(shutter).toHaveText(/SNAP PHOTO/);

    // Holding Space: the browser repeats the key, but only the first press fires.
    await page.keyboard.down('Space');
    await page.keyboard.down('Space'); // a repeat
    await page.keyboard.down('Space');
    await page.keyboard.up('Space');
    expect(await game(`return window.__P.remainingFilm;`)).toBe(film0 - 1);
    // A second shot right away waits for the print, and the button says so.
    expect(await game(`return G.takePolaroidPhoto();`)).toBeNull();
    await expect(shutter).toHaveText(/EJECTING/);
    await expect(shutter).toHaveAttribute('aria-disabled', 'true');
    // Once it's out, the camera is ready again (the button updates by itself as the ride runs).
    await expect(shutter).toHaveText(/SNAP PHOTO/, { timeout: 15_000 });
    expect(await game(`return !!G.takePolaroidPhoto() && window.__P.remainingFilm;`)).toBe(film0 - 2);
  });

  test('with no film left the shutter says so, and pressing it explains', async ({ page, game }) => {
    await game(`ride(0); window.__P.remainingFilm = 0; window.__P.setViewfinder(true); G.notifyUI();`);
    const shutter = page.getByTestId('shutter');
    await expect(shutter).toHaveText(/OUT OF FILM/);
    await expect(shutter).toBeDisabled();
    await expect(page.getByText('00 / 10')).toBeVisible();
    await page.keyboard.press('Space');
    expect(await game(`return G.hintText;`)).toBe('Out of film.');
  });

  test('during an answer prompt the camera and recorder stay down, the buttons show it, and pressing says why', async ({ page, game }) => {
    await game(`ride(6); window.__EVP.hasRecorder = true; window.__P.setViewfinder(true);
      G.presentChoice({ items: [{ txt: 'Nothing.', val: 'a' }, { txt: 'Fine.', val: 'b' }], window: 99, onPick: () => {} });`);
    // A prompt lowers a raised camera, so the answers are never hidden behind it.
    expect(await game(`return window.__P.isViewfinderOpen;`)).toBe(false);
    await expect(page.getByRole('button', { name: 'Nothing.' })).toBeVisible();

    await page.keyboard.press('KeyC');
    expect(await game(`return [window.__P.isViewfinderOpen, G.hintText];`)).toEqual([false, 'Answer first.']);
    await page.keyboard.press('KeyR');
    expect(await game(`return window.__EVP.raised;`)).toBe(false);
    await expect(page.getByRole('button', { name: 'Polaroid Camera' })).toHaveAttribute('aria-disabled', 'true');
    await expect(page.getByRole('button', { name: 'Recorder' })).toHaveAttribute('aria-disabled', 'true');

    // Answered: both come back.
    await page.getByRole('button', { name: 'Nothing.' }).click();
    await expect(page.getByRole('button', { name: 'Polaroid Camera' })).not.toHaveAttribute('aria-disabled');
    await page.keyboard.press('KeyC');
    expect(await game(`return window.__P.isViewfinderOpen;`)).toBe(true);
  });

  test('pressing R before Dad hands over the recorder says there’s nothing to record with', async ({ page, game }) => {
    await game(`ride(1);`);
    await page.keyboard.press('KeyR');
    expect(await game(`return [window.__EVP.raised, G.hintText];`)).toEqual([false, 'You don’t have anything to record with.']);
  });

  test('the route selector describes what switching does, without promising a delay that doesn’t happen', async ({ page, game }) => {
    await game(`ride(1);`);
    await page.keyboard.press('KeyL');
    const dialog = page.getByRole('dialog');
    await expect(dialog).toContainText('Every new ride starts on the G.');
    await expect(dialog).not.toContainText('haven station');
  });
});
