/**
 * Viewport cover scale compensation during physical subway screen-shake.
 * Prevents screen boundaries from exposing empty background margins.
 */
export const SHAKE_BLEED_PX = 16;

export function shakeCoverScale(
  width: number,
  height: number,
  bleedPx: number,
  shake: { x: number; y: number; rot: number; intensity: number } | number
): number {
  const intensity = typeof shake === 'number' ? shake : Math.hypot(shake.x, shake.y);
  const minDim = Math.min(width, height) || 600;
  const padding = bleedPx + intensity;
  return Math.max(1, 1 + (padding * 2) / minDim);
}
