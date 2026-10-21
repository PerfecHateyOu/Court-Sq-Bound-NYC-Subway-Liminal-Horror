/**
 * Keyboard look with the arrow keys. (WASD walks between cars; see App.tsx.)
 *
 * Keys are tracked while held and the view turns every frame at a steady rate, scaled by the
 * Look speed setting, instead of stepping on each OS key-repeat. At 2x look speed the fastest
 * turn (3.6 rad/s) is still below the head-whip threshold (5.5 rad/s), so keyboard turning
 * never raises suspicion on its own.
 */
import type { GameEngine } from '../game/gameState';

/** Turn rate in rad/s at 1x look speed. */
export const KEY_LOOK_RATE = { yaw: 1.8, pitch: 1.2 };

const DIRS: Record<string, [number, number]> = {
  ArrowLeft: [1, 0],
  ArrowRight: [-1, 0],
  ArrowUp: [0, 1],
  ArrowDown: [0, -1],
};

export class KeyLook {
  private held = new Set<string>();

  public static isLookKey(code: string): boolean {
    return code in DIRS;
  }

  public press(code: string) {
    if (code in DIRS) this.held.add(code);
  }

  public release(code: string) {
    this.held.delete(code);
  }

  /** Forget held keys (pause, lost focus): their keyup may never arrive. */
  public clear() {
    this.held.clear();
  }

  public get active(): boolean {
    return this.held.size > 0;
  }

  /** Turn the view for this frame. */
  public apply(G: GameEngine, dt: number, lookSpeed: number) {
    if (!this.held.size) return;
    let x = 0;
    let y = 0;
    for (const code of this.held) {
      x += DIRS[code][0];
      y += DIRS[code][1];
    }
    // Opposite arrows cancel out.
    x = Math.max(-1, Math.min(1, x));
    y = Math.max(-1, Math.min(1, y));
    if (!x && !y) return;
    G.ty = limitYaw(G.phase, G.ty + x * KEY_LOOK_RATE.yaw * lookSpeed * dt);
    G.tp = Math.max(-0.6, Math.min(0.72, G.tp + y * KEY_LOOK_RATE.pitch * lookSpeed * dt));
  }
}

/**
 * Where the view may turn. In the train you can turn all the way around in your seat (no limit;
 * the yaw only feeds sin/cos, so it can keep growing past a full turn). The False Stop Trial is
 * a stage built to be seen from the front, so it keeps its limit.
 */
export const TRIAL_YAW_LIMIT = 1.2;
export function limitYaw(phase: string, ty: number): number {
  return phase === 'trial' ? Math.max(-TRIAL_YAW_LIMIT, Math.min(TRIAL_YAW_LIMIT, ty)) : ty;
}
