/**
 * Haptic reward for catching anomalies, via the browser Vibration API.
 *
 * Design: the pulses fire when the train arrives at a stop, one per anomaly caught on that
 * ride, never at the moment of flagging. Flags stay private and a single flag is never
 * confirmed in real time (same rule as the flag sound), but attention to detail still pays off.
 *
 * Support: Android browsers. iOS (every browser) does not implement navigator.vibrate, and
 * desktops have no motor, so this is a silent no-op there.
 */

const STORAGE_KEY = 'gtrain-haptics';
const PULSE_MS = 22; // short and soft: felt, not buzzed
const GAP_MS = 160;
const MAX_PULSES = 3; // a stop has at most 3 anomalies

class Haptics {
  public readonly supported: boolean =
    typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';
  public enabled: boolean = true;

  constructor() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved !== null) this.enabled = saved === '1';
    } catch {
      /* storage unavailable: keep the default */
    }
  }

  public setEnabled(on: boolean) {
    this.enabled = on;
    try {
      localStorage.setItem(STORAGE_KEY, on ? '1' : '0');
    } catch {
      /* not persisted this session */
    }
    if (!on) this.stop();
  }

  /** One soft pulse per caught anomaly, e.g. 2 catches → [22, 160, 22]. */
  public catches(count: number) {
    if (!this.supported || !this.enabled || count <= 0) return;
    const pattern: number[] = [];
    for (let i = 0; i < Math.min(count, MAX_PULSES); i++) {
      if (i > 0) pattern.push(GAP_MS);
      pattern.push(PULSE_MS);
    }
    try {
      navigator.vibrate(pattern);
    } catch {
      /* some browsers throw without a recent user gesture */
    }
  }

  public stop() {
    if (!this.supported) return;
    try {
      navigator.vibrate(0);
    } catch {
      /* ignore */
    }
  }
}

export const haptics = new Haptics();
