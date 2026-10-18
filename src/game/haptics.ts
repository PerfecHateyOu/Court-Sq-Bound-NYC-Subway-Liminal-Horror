/**
 * Haptic Vibration Feedback Controller
 */
class HapticsManager {
  private enabled = true;

  public vibrate(pattern: number | number[]) {
    if (!this.enabled || typeof window === 'undefined' || !('vibrate' in navigator)) return;
    try {
      navigator.vibrate(pattern);
    } catch {
      /* ignore */
    }
  }

  public tick() {
    this.vibrate(15);
  }

  public heartbeat() {
    this.vibrate([25, 40, 35]);
  }

  public flash() {
    this.vibrate(60);
  }

  public shutter() {
    this.vibrate([20, 25, 20]);
  }

  public warning() {
    this.vibrate([40, 60, 40, 60, 50]);
  }

  public stop() {
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(0);
      } catch {
        /* ignore */
      }
    }
  }

  public catches() {
    this.vibrate([30, 20, 40]);
  }
}

export const haptics = new HapticsManager();
