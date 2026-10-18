/**
 * Smooth Keyboard Look Controller for Arrow Keys
 * Provides calibrated turn rate of ~1.8 rad/s scaled by sensitivity.
 */
export class KeyLook {
  private held = new Set<string>();

  public static isLookKey(code: string): boolean {
    return (
      code === 'ArrowLeft' ||
      code === 'ArrowRight' ||
      code === 'ArrowUp' ||
      code === 'ArrowDown'
    );
  }

  public clear() {
    this.held.clear();
  }

  public down(code: string): boolean {
    if (KeyLook.isLookKey(code)) {
      this.held.add(code);
      return true;
    }
    return false;
  }

  public up(code: string): boolean {
    if (KeyLook.isLookKey(code)) {
      this.held.delete(code);
      return true;
    }
    return false;
  }

  public isHeld(code: string): boolean {
    return this.held.has(code);
  }

  /**
   * Returns yaw and pitch deltas in radians for this frame
   */
  public update(dt: number, sensitivity: number = 1.0): { dty: number; dtp: number } {
    const baseSpeed = 1.8; // rad/s
    let dty = 0;
    let dtp = 0;

    if (this.held.has('ArrowLeft')) dty += baseSpeed * sensitivity * dt;
    if (this.held.has('ArrowRight')) dty -= baseSpeed * sensitivity * dt;
    if (this.held.has('ArrowUp')) dtp += baseSpeed * sensitivity * dt;
    if (this.held.has('ArrowDown')) dtp -= baseSpeed * sensitivity * dt;

    return { dty, dtp };
  }
}
