/**
 * Psychological Anomaly Log & Archival Case Files
 */
import { StopLogRecord } from '../types';

export type AnomalyTier = 1 | 2 | 3;

export interface PsychEntryDef {
  id: string;
  tier: AnomalyTier;
  title: string;
  note: string;
}

export const PSYCH_CLASS: Record<AnomalyTier, string> = {
  1: 'I (Distortion)',
  2: 'II (Perception)',
  3: 'III (Spatial Inversion)',
};

export const PSYCH_ENTRIES: Record<string, PsychEntryDef> = {
  adswap: {
    id: 'adswap',
    tier: 1,
    title: 'Anomalous Advertising Placard',
    note: 'Commercial prints replaced with surveillance warnings or distorted faces.',
  },
  flicker: {
    id: 'flicker',
    tier: 1,
    title: 'Ceiling Fluorescent Decay',
    note: 'Strobe rate drops below 50 Hz, casting unnatural elongated shadows.',
  },
  stare: {
    id: 'stare',
    tier: 1,
    title: 'Uncanny Commuter Gaze',
    note: 'Passengers turn in complete synchronicity without shifting their posture.',
  },
  doors: {
    id: 'doors',
    tier: 1,
    title: 'Premature Door Cycle',
    note: 'Pneumatics cycle before deceleration without station contact.',
  },
  momface: {
    id: 'momface',
    tier: 2,
    title: 'Maternal Facial Drift',
    note: 'Facial landmarks blur or duplicate when looking directly into passenger eyes.',
  },
  dadstare: {
    id: 'dadstare',
    tier: 2,
    title: 'Unblinking Paternal Stare',
    note: 'Prolonged gaze tracking without eyelid movement or respiratory heave.',
  },
  windowface: {
    id: 'windowface',
    tier: 2,
    title: 'Tunnel Reflected Silhouette',
    note: 'Glass reflections show empty seats or standing silhouettes outside the moving car.',
  },
  whisper: {
    id: 'whisper',
    tier: 2,
    title: 'PA Heterodyne Murmur',
    note: 'Dispatcher announcements subverted into repetitive mnemonic loops.',
  },
  emptycar: {
    id: 'emptycar',
    tier: 2,
    title: 'Gangway Desolation',
    note: 'Adjacent cars appear entirely deserted despite earlier boarding records.',
  },
  stretch: {
    id: 'stretch',
    tier: 3,
    title: 'Corridor Elongation',
    note: 'Car interior proportions expand longitudinally beyond standard R46 dimensions.',
  },
  inversion: {
    id: 'inversion',
    tier: 3,
    title: 'Gravitational Dip',
    note: 'Vertical orientation shifts, creating visual vertigo and ceiling pull.',
  },
  chimeglitch: {
    id: 'chimeglitch',
    tier: 3,
    title: 'Chime Pitch Sabotage',
    note: 'Two-tone chime plays backward in minor third intervals.',
  },
  shadowman: {
    id: 'shadowman',
    tier: 3,
    title: 'Catwalk Shadow Commuter',
    note: 'Silhouette walking along tunnel catenary wires at cruising speed.',
  },
};

export const PSYCH_IDS = Object.keys(PSYCH_ENTRIES);

export interface ArchiveRecord {
  seen: number;
  caught: number;
  first: number;
}

export type PsychArchive = Record<string, ArchiveRecord>;

export interface PsychLogResult {
  archive: PsychArchive;
  unlockedNew: boolean;
}

const STORAGE_KEY = 'gtrain-psychlog';

export function entryState(rec?: ArchiveRecord): 'documented' | 'unconfirmed' | 'redacted' {
  if (!rec || rec.seen === 0) return 'redacted';
  if (rec.caught > 0) return 'documented';
  return 'unconfirmed';
}

export function loadArchive(): PsychArchive {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export function saveArchive(a: PsychArchive) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(a));
  } catch {
    /* ignore */
  }
}

export function recordRide(stopLog: StopLogRecord[]): PsychLogResult {
  const archive = loadArchive();
  let unlockedNew = false;

  stopLog.forEach((s) => {
    (s.anoms || []).forEach((a) => {
      const id = a.id;
      if (!PSYCH_ENTRIES[id]) return;
      const existing = archive[id] || { seen: 0, caught: 0, first: Date.now() };
      if (existing.seen === 0) unlockedNew = true;
      existing.seen++;
      if (a.hit) existing.caught++;
      archive[id] = existing;
    });
  });

  saveArchive(archive);
  return { archive, unlockedNew };
}
