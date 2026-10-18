import { test, expect } from './game';

// Player feedback: an action that can't happen says why, and repeated input doesn't repeat it.

test.describe('Camera input', () => {
  test('holding Space takes one photo, and a quick double click or double tap takes one', async ({ page, game }) => {
    await game(`ride(0); window.__P.setViewfinder(true);`);
    const film = () => game(`return window.__P.remainingFilm;`);
    const start = await film();

    // A held key repeats keydown; only the first one snaps.
    await page.keyboard.down('Space');
    await game(`for (let i = 0; i < 5; i++) window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space', repeat: true }));`);
    await page.keyboard.up('Space');
    expect(await film()).toBe(start - 1);

    // A second press right after the first is ignored (the SNAP button, or taps on the view);
    // after the cooldown it snaps again.
    await page.waitForTimeout(800);
    await page.getByRole('button', { name: /SNAP PHOTO/ }).evaluate((b: HTMLElement) => { b.click(); b.click(); });
    expect(await film()).toBe(start - 2);
    await page.waitForTimeout(800);
    await game(`const el = R.renderer.domElement;
      const fire = (type, id) => el.dispatchEvent(new PointerEvent(type, { pointerId: id, pointerType: 'touch', isPrimary: true, button: 0, clientX: 300, clientY: 180, bubbles: true }));
      for (const id of [21, 22]) { fire('pointerdown', id); await sleep(40); fire('pointerup', id); await sleep(40); }`);
    expect(await film()).toBe(start - 3);
    await page.waitForTimeout(800);
    await page.getByRole('button', { name: /SNAP PHOTO/ }).click();
    expect(await film()).toBe(start - 4);
  });

  test('out of film, the viewfinder says so and what happens to the prints', async ({ page, game }) => {
    await game(`ride(0); const P = window.__P; P.remainingFilm = 0; P.setViewfinder(true);`);
    const button = page.getByRole('button', { name: /OUT OF FILM/ });
    await expect(button).toBeDisabled();
    await expect(page.getByTestId('out-of-film')).toHaveText('Out of film. Your prints develop after the ride.');
    await expect(page.getByText('00 / 10')).toBeVisible();
  });
});

test.describe('Recorder', () => {
  test('flagging with the recorder up says to lower it, once per press', async ({ game }) => {
    const r = await game(`ride(2); G.seg._masks = []; window.__EVP.hasRecorder = true; G.toggleRecorder();
      G.hintText = ''; G.flagHeld = true; G.gazeTid = 'anything'; G.updateFlag(0.05); const first = G.hintText;
      G.hintText = ''; G.updateFlag(0.05); const held = G.hintText;
      G.flagHeld = false; G.updateFlag(0.05); G.flagHeld = true; G.updateFlag(0.05); const again = G.hintText;
      G.flagHeld = false; G.toggleRecorder(); return { first, held, again, prog: G.flagProg };`);
    expect(r.first).toBe('Hands full: lower the recorder to flag (press R).');
    expect(r.held).toBe(''); // not repeated every frame while held
    expect(r.again).toBe(r.first); // a new press says it again
    expect(r.prog).toBe(0);
  });

  test('it won’t come up during a prompt or the restraint, and says why', async ({ game }) => {
    const r = await game(`ride(2); G.seg._masks = []; window.__EVP.hasRecorder = true;
      G.startMaskCheck(); G.hintText = ''; const raised = G.toggleRecorder(); const duringChoice = G.hintText;
      G.pickChoiceIndex(0); G.restraint = { t: 0 }; G.hintText = ''; G.toggleRecorder(); const duringRestraint = G.hintText;
      G.restraint = null; return { raised, duringChoice, duringRestraint };`);
    expect(r.raised).toBe(false);
    expect(r.duringChoice).toBe('Hands full: answer first, then raise the recorder.');
    expect(r.duringRestraint).toBe('Not now: keep holding on.');
  });
});
