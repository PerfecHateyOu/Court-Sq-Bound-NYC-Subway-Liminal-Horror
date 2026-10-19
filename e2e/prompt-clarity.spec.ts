import { test, expect } from './game';

// Part of #39, section 3: prompts and labels say plainly what things are and what to do,
// with one name for one thing.

test.describe('Prompts and labels', () => {
  test('the evidence log has one name: the HUD button, the viewfinder button and the panel agree', async ({ page, game }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await game(`ride(1);`);
    const hudButton = page.getByRole('button', { name: 'Evidence Log', exact: true });
    await expect(hudButton).toContainText('Evidence');
    await hudButton.click();
    await expect(page.getByRole('heading', { name: 'Evidence Log' })).toBeVisible();
    await page.keyboard.press('Escape');
    await game(`window.__P.setViewfinder(true); G.notifyUI();`);
    await expect(page.getByRole('button', { name: /^Evidence Log \(\d+ prints?\)$/ })).toContainText('Evidence (');
    await game(`window.__P.setViewfinder(false); G.notifyUI();`);
    // No leftover "Album" anywhere on the ride's controls.
    await expect(page.getByRole('button', { name: /album/i })).toHaveCount(0);
  });

  test('the desktop key hints lead with the flag, and add the recorder once you have it', async ({ page, game }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await game(`ride(1);`);
    const bar = page.getByText('[F] FLAG').locator('..');
    await expect(bar).toContainText('[C] CAMERA');
    await expect(bar).toContainText('[TAB] EVIDENCE');
    await expect(bar).not.toContainText('[R] RECORDER');
    await game(`window.__EVP.hasRecorder = true; G.notifyUI();`);
    await expect(bar).toContainText('[R] RECORDER');
  });

  test('switching lines says where you are now, in plain words, and only when the line changes', async ({ page, game }) => {
    await game(`ride(1); G.hintText = '';`);
    await page.keyboard.press('KeyL');
    await page.getByRole('dialog').getByRole('button', { name: /current line/ }).click(); // the G again
    expect(await game(`return G.hintText;`)).toBe('');
    await page.keyboard.press('KeyL');
    await page.getByRole('dialog').getByRole('button', { name: /^L / }).click();
    expect(await game(`return G.hintText;`)).toBe('Now on the L: 8th Av to Myrtle–Wyckoff Avs.');
  });

  test('E away from a gangway door says where the doors are', async ({ page, game }) => {
    await game(`ride(1); G.hintText = '';`);
    await page.keyboard.press('KeyE');
    expect(await game(`return [G.hintText, G.nearGangwayDoor];`)).toEqual(['Walk to the end of the car to open a gangway door.', null]);
  });

  test('every main action visibly responds: recorder, camera, evidence log, line switch, settings', async ({ page, game }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await game(`ride(6); G.seg._masks = []; window.__EVP.hasRecorder = true; G.notifyUI();`);

    // Recorder: the panel comes up, and holding Space shows it recording.
    await page.keyboard.press('KeyR');
    await expect(page.getByText('MICROCASSETTE')).toBeVisible();
    await page.keyboard.down('Space');
    await expect(page.getByLabel('Recording', { exact: true })).toBeVisible();
    await page.keyboard.up('Space');
    await expect(page.getByLabel('Not recording')).toBeVisible();
    await page.keyboard.press('KeyR');

    // Camera: the viewfinder, then a shot uses a frame of film and lands in the evidence log.
    // (The flash itself lasts a fifth of a second: too brief to check reliably under load.)
    await page.keyboard.press('KeyC');
    const film = page.getByText(/^\d\d \/ 10$/);
    const before = await film.textContent();
    await page.keyboard.press('Space');
    await expect(film).not.toHaveText(before!);
    await expect(page.getByRole('button', { name: 'Evidence Log (1 print)' })).toBeVisible();
    await page.keyboard.press('KeyC');

    // Evidence log: opens on Tab, with the print in it.
    await page.keyboard.press('Tab');
    await expect(page.getByRole('heading', { name: 'Evidence Log' })).toBeVisible();
    await page.keyboard.press('Escape');

    // Line switch: the HUD bullet and the next stop change, with a line saying so.
    await page.keyboard.press('KeyL');
    await page.getByRole('dialog').getByRole('button', { name: /^L / }).click();
    await expect(page.getByTestId('hud-route-panel')).toHaveAccessibleName(/^L train, next stop Lorimer St/);
    await expect(page.getByText('Now on the L:')).toBeVisible();

    // Settings: a slider shows its new value straight away.
    await page.keyboard.press('KeyP');
    await page.getByRole('button', { name: /Settings/ }).first().click();
    const d = page.locator('[role=dialog][aria-labelledby=settings-title]');
    await d.getByLabel('Game sounds').fill('0.4');
    await expect(d.getByText('40%')).toBeVisible();
  });
});
