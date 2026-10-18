/**
 * Player settings, saved on this device.
 */
import { useSyncExternalStore } from 'react';

export type ScreenEffects = 'system' | 'full' | 'reduced';

export interface Settings {
  lookSensitivity: number;
  invertY: boolean;
  gameVolume: number;
  musicVolume: number;
  screenEffects: ScreenEffects;
}

export const SENSITIVITY_RANGE = [0.4, 2.0] as const;

export const DEFAULT_SETTINGS: Settings = {
  lookSensitivity: 1,
  invertY: false,
  gameVolume: 1,
  musicVolume: 1,
  screenEffects: 'system',
};

const KEY = 'gtrain-settings';
export const PROGRESS_KEYS = [
  'gtrain-psychlog',
  'gtrain-runs',
  'gtrain-tapes',
  'gtrain-endings',
  'courtSq_endingsArchive',
  'gtrain-polaroids',
  'gtrain-achievements',
];

const clamp = (v: unknown, lo: number, hi: number, d: number) =>
  typeof v === 'number' && Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : d;

function sanitize(raw: any): Settings {
  const d = DEFAULT_SETTINGS;
  if (!raw || typeof raw !== 'object') return { ...d };
  return {
    lookSensitivity: clamp(raw.lookSensitivity, SENSITIVITY_RANGE[0], SENSITIVITY_RANGE[1], d.lookSensitivity),
    invertY: typeof raw.invertY === 'boolean' ? raw.invertY : d.invertY,
    gameVolume: clamp(raw.gameVolume, 0, 1, d.gameVolume),
    musicVolume: clamp(raw.musicVolume, 0, 1, d.musicVolume),
    screenEffects: ['system', 'full', 'reduced'].includes(raw.screenEffects) ? raw.screenEffects : d.screenEffects,
  };
}

class SettingsStore {
  private value: Settings;
  private listeners = new Set<() => void>();
  private systemReduced = false;
  private progressEpoch = 0;

  constructor() {
    let raw: unknown = null;
    try {
      raw = JSON.parse(localStorage.getItem(KEY) || 'null');
    } catch {
      /* use defaults */
    }
    this.value = sanitize(raw);

    if (typeof window !== 'undefined' && window.matchMedia) {
      const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
      this.systemReduced = mq.matches;
      mq.addEventListener?.('change', (e) => {
        this.systemReduced = e.matches;
        this.emit();
      });
    }
  }

  public get = (): Settings => this.value;

  public set(patch: Partial<Settings>) {
    this.value = sanitize({ ...this.value, ...patch });
    try {
      localStorage.setItem(KEY, JSON.stringify(this.value));
    } catch {
      /* ignore */
    }
    this.emit();
  }

  public subscribe = (fn: () => void) => {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  };

  public effectsReduced = (): boolean => {
    if (this.value.screenEffects === 'reduced') return true;
    if (this.value.screenEffects === 'full') return false;
    return this.systemReduced;
  };

  public getEpoch = (): number => this.progressEpoch;

  public eraseProgress() {
    PROGRESS_KEYS.forEach((k) => {
      try {
        localStorage.removeItem(k);
      } catch {
        /* ignore */
      }
    });
    this.progressEpoch++;
    this.emit();
  }

  private emit() {
    this.listeners.forEach((fn) => fn());
  }
}

export const settings = new SettingsStore();

export function useSettings(): Settings {
  return useSyncExternalStore(settings.subscribe, settings.get, () => DEFAULT_SETTINGS);
}

export function useProgressEpoch(): number {
  return useSyncExternalStore(settings.subscribe, settings.getEpoch, () => 0);
}
