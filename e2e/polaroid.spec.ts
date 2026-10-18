import { test, expect } from './game';

test.describe('polaroid camera', () => {
  test('a snapped photo shows the scene, not a flat grey frame', async ({ game }) => {
    const r = await game(`ride(0); await sleep(800);
      const photo = G.takePolaroidPhoto();
      if (!photo || !photo.dataUrl) return { ok: false };
      const img = new Image();
      await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = photo.dataUrl; });
      const c = document.createElement('canvas'); c.width = 64; c.height = 64;
      const ctx = c.getContext('2d'); ctx.drawImage(img, 0, 0, 64, 64);
      const d = ctx.getImageData(0, 0, 64, 64).data;
      let sum = 0, sq = 0, n = 0;
      for (let i = 0; i < d.length; i += 4) { const l = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]; sum += l; sq += l * l; n++; }
      const mean = sum / n;
      return { ok: true, std: Math.sqrt(Math.max(0, sq / n - mean * mean)) };`);
    expect(r.ok).toBe(true);
    expect(r.std).toBeGreaterThan(8);
  });

  test('on touch, a tap snaps a photo and a drag aims without snapping', async ({ game }) => {
    const r = await game(`ride(0); await sleep(300);
      const P = window.__P; P.setViewfinder(true);
      const el = R.renderer.domElement;
      const fire = (type, id, x, y) => el.dispatchEvent(new PointerEvent(type, { pointerId: id, pointerType: 'touch', isPrimary: true, button: 0, clientX: x, clientY: y, bubbles: true }));
      const film0 = P.remainingFilm;
      fire('pointerdown', 11, 300, 180); await sleep(60); fire('pointerup', 11, 302, 181);
      const afterTap = P.remainingFilm;
      const ty0 = G.ty;
      fire('pointerdown', 12, 300, 180);
      for (let i = 1; i <= 8; i++) { await sleep(20); fire('pointermove', 12, 300 - i * 10, 180); }
      fire('pointerup', 12, 220, 180);
      return { tapped: film0 - afterTap, dragged: afterTap - P.remainingFilm, turned: Math.abs(G.ty - ty0) };`);
    expect(r.tapped).toBe(1);
    expect(r.dragged).toBe(0);
    expect(r.turned).toBeGreaterThan(0.1);
  });

  test('Restart Ride resets film, photos, viewfinder and route', async ({ page, game }) => {
    const before = await game(`ride(0); await sleep(300);
      const P = window.__P; G.takePolaroidPhoto(); G.takePolaroidPhoto();
      window.__RT.setRoute('L'); P.setViewfinder(true);
      return { film: P.remainingFilm, photos: P.photos.length, route: window.__RT.routeId };`);
    expect(before).toEqual({ film: 6, photos: 2, route: 'L' });
    await page.keyboard.press('KeyP');
    await page.locator('text=/Restart Ride/i').click();
    await page.locator('[role=alertdialog] >> text=/^Restart$/').click();
    await page.waitForTimeout(500);
    const after = await game(`const P = window.__P;
      return { film: P.remainingFilm, photos: P.photos.length, viewfinder: P.isViewfinderOpen, album: P.isAlbumOpen,
        last: P.lastCapturedPhoto, route: window.__RT.routeId };`);
    expect(after).toEqual({ film: 8, photos: 0, viewfinder: false, album: false, last: null, route: 'G' });
  });
});
