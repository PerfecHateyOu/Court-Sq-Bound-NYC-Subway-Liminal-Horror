import { test, expect } from './game';

test.describe('Route selector and HUD route panel work from the keyboard', () => {
  test('the HUD route panel is a labelled button that opens the selector as a dialog', async ({ page, game }) => {
    await game(`ride(6);`); // heading to Flushing Av
    const panel = page.getByRole('button', { name: /G train, next stop Flushing Av\. Switch route line/ });
    await expect(panel).toBeVisible();
    await panel.focus();
    await page.keyboard.press('Enter');

    const dialog = page.getByRole('dialog', { name: 'MTA Transit Line Switching' });
    await expect(dialog).toBeVisible();
    // Focus starts on the line you're on.
    await expect(dialog.getByRole('button', { name: /G Brooklyn–Queens Crosstown \(current line\)/ })).toBeFocused();
  });

  test('Tab stays in the selector and leaves the album alone; Enter switches line and returns focus', async ({ page, game }) => {
    await game(`ride(6);`);
    const panel = page.locator('[data-testid=hud-route-panel]');
    await panel.focus();
    await page.keyboard.press('Enter');
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    // Order is Close, G, L, 7. From G, six Tabs go L, 7, wrap to Close, G, L, 7.
    for (let i = 0; i < 6; i++) await page.keyboard.press('Tab');
    await expect(dialog.getByRole('button', { name: /^7 Ghost Line/ })).toBeFocused();
    expect(await game(`return window.__P.isAlbumOpen`)).toBe(false);
    await page.keyboard.press('Shift+Tab');
    await expect(dialog.getByRole('button', { name: /^L 14th St/ })).toBeFocused();

    await page.keyboard.press('Enter');
    await expect(dialog).toHaveCount(0);
    expect(await game(`return window.__RT.routeId`)).toBe('L');
    await expect(panel).toBeFocused();
    await expect(panel).toHaveAccessibleName(/^L train, next stop Lorimer St\./);
  });

  test('Esc closes the selector without pausing the ride, and Space picks a line', async ({ page, game }) => {
    await game(`ride(2);`);
    const routeButton = page.getByRole('button', { name: 'Route Lines' });
    await routeButton.focus();
    await page.keyboard.press('Enter');
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
    expect(await game(`return G.paused`)).toBe(false);
    expect(await game(`return window.__RT.routeId`)).toBe('G');
    await expect(routeButton).toBeFocused();

    await page.keyboard.press('Enter');
    await page.keyboard.press('Tab'); // G -> L
    await page.keyboard.press('Space');
    await expect(dialog).toHaveCount(0);
    expect(await game(`return window.__RT.routeId`)).toBe('L');
  });

  test('L opens the selector mid-ride and L closes it; the ride keeps going and the album stays shut', async ({ page, game }) => {
    await game(`ride(6);`);
    await page.keyboard.press('KeyL');
    const dialog = page.getByRole('dialog', { name: 'MTA Transit Line Switching' });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('button', { name: /G Brooklyn–Queens Crosstown \(current line\)/ })).toBeFocused();
    await page.keyboard.press('Tab'); // G -> L, not the album
    expect(await game(`return [G.paused, window.__P.isAlbumOpen];`)).toEqual([false, false]);
    await page.keyboard.press('KeyL');
    await expect(dialog).toHaveCount(0);
    expect(await game(`return [G.paused, window.__RT.routeId];`)).toEqual([false, 'G']);
    await expect(page.getByRole('button', { name: 'Route Lines' })).toHaveAttribute('aria-keyshortcuts', 'L');

    // L does nothing while paused.
    await game(`G.pause();`);
    await page.keyboard.press('KeyL');
    await expect(dialog).toHaveCount(0);
  });

  test('with the mouse captured, L frees it for the selector without pausing the ride', async ({ page, game }) => {
    await game(`ride(6);`);
    // Fake a captured mouse (headless browsers can't lock the pointer): exiting the lock fires
    // pointerlockchange, as the browser would.
    await page.evaluate(() => {
      const canvas = document.querySelector('canvas');
      let locked: Element | null = canvas;
      Object.defineProperty(document, 'pointerLockElement', { configurable: true, get: () => locked });
      document.exitPointerLock = () => {
        locked = null;
        document.dispatchEvent(new Event('pointerlockchange'));
      };
    });
    await page.keyboard.press('KeyL');
    await expect(page.getByRole('dialog')).toBeVisible();
    expect(await game(`return [G.paused, !!document.pointerLockElement];`)).toEqual([false, false]);

    // Close it; losing the mouse any other way (the browser's own Esc) still pauses.
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await page.evaluate(() => document.dispatchEvent(new Event('pointerlockchange')));
    expect(await game(`return G.paused;`)).toBe(true);
  });
});
