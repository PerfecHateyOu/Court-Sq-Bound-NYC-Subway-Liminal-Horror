import { test, expect, board } from './game';

test('start screen loads, boarding works, and the car renders', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('text=/Board the train/i')).toBeVisible();
  const run = await board(page);
  await page.waitForTimeout(1500);
  // Render a frame and measure it: a blank or black canvas means the scene didn't draw.
  const img = await run<{ mean: number; sd: number }>(`
    R.renderer.render(R.scene, R.camera);
    const im = new Image(); im.src = R.renderer.domElement.toDataURL(); await im.decode();
    const c = document.createElement('canvas'); c.width = 64; c.height = 36;
    const x = c.getContext('2d'); x.drawImage(im, 0, 0, 64, 36);
    const d = x.getImageData(0, 0, 64, 36).data; const l = [];
    for (let i = 0; i < d.length; i += 4) l.push(0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]);
    const mean = l.reduce((a, v) => a + v, 0) / l.length;
    return { mean, sd: Math.sqrt(l.reduce((a, v) => a + (v - mean) ** 2, 0) / l.length) };`);
  expect(img.mean).toBeGreaterThan(10);
  expect(img.sd).toBeGreaterThan(5);
});
