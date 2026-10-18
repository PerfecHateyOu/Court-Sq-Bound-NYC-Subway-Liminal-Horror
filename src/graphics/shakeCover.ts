/**
 * Screen shake moves and rotates the whole 3D view with a CSS transform. The view only extends
 * SHAKE_BLEED_PX past each screen edge, so a big enough shift or rotation would uncover the
 * page behind it at the edges and corners. This works out the smallest zoom that keeps all
 * four screen corners covered.
 */

/** How far the 3D view extends past each screen edge (matches `-inset-2` in App.tsx). */
export const SHAKE_BLEED_PX = 8;

/**
 * Smallest scale (>= 1) so that a (W + 2*bleed) x (H + 2*bleed) box centred on the screen,
 * transformed by translate(x, y) rotate(rot deg) scale(s) about its centre, covers the screen.
 */
export function shakeCoverScale(
  W: number,
  H: number,
  bleed: number,
  shake: { x: number; y: number; rot: number }
): number {
  const hw = W / 2 + bleed;
  const hh = H / 2 + bleed;
  const a = (-shake.rot * Math.PI) / 180;
  const c = Math.cos(a);
  const s = Math.sin(a);
  let need = 1;
  for (const [cx, cy] of [
    [-W / 2, -H / 2],
    [W / 2, -H / 2],
    [-W / 2, H / 2],
    [W / 2, H / 2],
  ]) {
    // Screen corner, undone through translate and rotate, must lie within the scaled box.
    const px = cx - shake.x;
    const py = cy - shake.y;
    const lx = px * c - py * s;
    const ly = px * s + py * c;
    need = Math.max(need, Math.abs(lx) / hw, Math.abs(ly) / hh);
  }
  return need * 1.002; // a hair extra so anti-aliased edges never show a seam
}
