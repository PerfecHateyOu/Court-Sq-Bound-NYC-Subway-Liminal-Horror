/**
 * Heartbeat trace: a tiny ECG line in the HUD, a non-verbal read of the player's state.
 * It draws from the engine's heart clock (the same clock as the Critical-tier thump), so it
 * pauses with the game and speeds up, brightens and turns irregular as sanity tier worsens.
 * Decorative only: aria-hidden, and static when screen effects are reduced (the setting, or
 * the device's reduced-motion preference).
 */
import React, { useEffect, useRef } from 'react';
import { GameEngine } from '../game/gameState';
import { HEART_BPM } from '../constants';
import { settings } from '../settings';

const W = 56; // CSS px
const H = 18;
const WINDOW_S = 2.4; // seconds of history across the width

// Per tier (High → Critical): stroke color and opacity. Quiet at High, insistent at Critical.
const TIER_STYLE: Array<{ rgb: [number, number, number]; alpha: number }> = [
  { rgb: [236, 230, 211], alpha: 0.32 },
  { rgb: [236, 230, 211], alpha: 0.45 },
  { rgb: [227, 168, 58], alpha: 0.62 },
  { rgb: [217, 99, 79], alpha: 0.82 },
];

/** ECG shape after a beat at dt seconds: sharp R spike, small dip, then a soft T wave. */
function ecg(dt: number): number {
  if (dt < 0) return 0;
  if (dt < 0.025) return dt / 0.025;
  if (dt < 0.05) return 1 - 1.3 * ((dt - 0.025) / 0.025);
  if (dt < 0.075) return -0.3 + 0.3 * ((dt - 0.05) / 0.025);
  if (dt >= 0.16 && dt < 0.36) return 0.22 * Math.sin((Math.PI * (dt - 0.16)) / 0.2);
  return 0;
}


export const HeartbeatTrace: React.FC<{ engine: GameEngine }> = React.memo(({ engine }) => {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.scale(dpr, dpr);

    const color = [...TIER_STYLE[0].rgb, TIER_STYLE[0].alpha];
    let raf = 0;
    let last = performance.now();
    let drawnTier = -1;
    let wasStill: boolean | null = null;

    const draw = (now: number) => {
      raf = requestAnimationFrame(draw);
      const G = engine;
      const tier = Math.max(0, Math.min(3, G.tier));
      // Read each frame so changing the setting mid-ride takes effect at once.
      const still = settings.effectsReduced();
      if (still !== wasStill) {
        wasStill = still;
        drawnTier = -1;
      }
      // Reduced motion: a static trace, redrawn only when the tier changes.
      if (still && tier === drawnTier) return;
      drawnTier = tier;
      const style = TIER_STYLE[tier];
      // Ease color and opacity toward the tier's style (snap under reduced motion).
      const k = still ? 1 : 1 - Math.exp(-(now - last) / 600);
      last = now;
      for (let i = 0; i < 3; i++) color[i] += (style.rgb[i] - color[i]) * k;
      color[3] += (style.alpha - color[3]) * k;

      // Under reduced motion, draw evenly spaced beats at the tier's rate and don't scroll.
      const t1 = still ? WINDOW_S : G.GT;
      const beats = still
        ? Array.from({ length: 8 }, (_, i) => i * (60 / HEART_BPM[G.tier]) + 0.2)
        : G.heartBeats;

      ctx.clearRect(0, 0, W, H);
      const base = H * 0.62;
      const amp = H * 0.42;
      const [r, g, b, a] = color;

      // The line fades toward the older (left) end, like a monitor sweep.
      const grad = ctx.createLinearGradient(0, 0, W, 0);
      grad.addColorStop(0, `rgba(${r | 0},${g | 0},${b | 0},${(a * 0.12).toFixed(3)})`);
      grad.addColorStop(1, `rgba(${r | 0},${g | 0},${b | 0},${a.toFixed(3)})`);
      ctx.strokeStyle = grad;
      ctx.lineWidth = 1.25;
      ctx.lineJoin = 'round';
      ctx.beginPath();
      for (let x = 0; x <= W; x += 0.5) {
        const t = t1 - WINDOW_S * (1 - x / W);
        let y = 0;
        for (let i = beats.length - 1; i >= 0; i--) {
          const dt = t - beats[i];
          if (dt >= 0) {
            y = ecg(dt);
            break;
          }
        }
        const py = base - y * amp;
        if (x === 0) ctx.moveTo(x, py);
        else ctx.lineTo(x, py);
      }
      ctx.stroke();

      // Leading dot flares briefly on each beat.
      const lastBeat = beats.length ? beats[beats.length - 1] : -9;
      const flare = still ? 0 : Math.max(0, 1 - (t1 - lastBeat) / 0.25);
      ctx.fillStyle = `rgba(${r | 0},${g | 0},${b | 0},${Math.min(1, a + flare * 0.4).toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(W - 1.8, base, 1.4 + flare * 0.9, 0, Math.PI * 2);
      ctx.fill();
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [engine]);

  return (
    <canvas
      ref={ref}
      aria-hidden="true"
      data-testid="heartbeat-trace"
      style={{ width: W, height: H }}
      className="block"
    />
  );
});
