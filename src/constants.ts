/**
 * Constants & Balance Tuning for Court Sq-Bound (v5.1)
 */
import { SegmentDef } from './types';

export const CFG = {
  version: '5.1',
  carCount: 3,
  carLength: 22,
  flagHold: 0.8,
  misleadChance: 0.35,
  dwellReact: 1.2,
  snapThresh: 0.15,
  snapThreshTouch: 0.25,
  snapArc: 0.4,
  snapArcTouch: 0.6,
};

export interface ChapterDef {
  index: number;
  numeral: string;
  title: string;
  titleOffG?: string;
  subtitle: string;
  stops: [number, number];
  startStop: number;
  endStop: number;
}

export const CHAPTERS: ChapterDef[] = [
  {
    index: 1,
    numeral: 'CHAPTER I',
    title: 'THE DESCENT',
    subtitle: 'Hoyt–Schermerhorn to Bedford–Nostrand Avs',
    stops: [1, 5],
    startStop: 1,
    endStop: 5,
  },
  {
    index: 2,
    numeral: 'CHAPTER II',
    title: 'SIGNAL DRIFT',
    subtitle: 'Myrtle–Willoughby Avs to Nassau Av',
    stops: [6, 10],
    startStop: 6,
    endStop: 10,
  },
  {
    index: 3,
    numeral: 'CHAPTER III',
    title: 'OPERATION SKYWARD',
    titleOffG: 'THE LAST STRETCH',
    subtitle: 'Greenpoint Av to Court Sq',
    stops: [11, 13],
    startStop: 11,
    endStop: 13,
  },
];

export function chapterForStop(stop: number): ChapterDef {
  if (stop <= 5) return CHAPTERS[0];
  if (stop <= 10) return CHAPTERS[1];
  return CHAPTERS[2];
}

export const STOPS = [
  'Church Av',
  'Hoyt–Schermerhorn',
  'Fulton St',
  'Clinton–Washington Avs',
  'Classon Av',
  'Bedford–Nostrand Avs',
  'Myrtle–Willoughby Avs',
  'Flushing Av',
  'Broadway',
  'Metropolitan Av',
  'Nassau Av',
  'Greenpoint Av',
  '21 St',
  'Court Sq',
];

export interface AdDefinition {
  h: string;
  sub?: string;
  body?: string;
  bg?: string;
  fg?: string;
  border?: string;
  category?: 'lawyer' | 'tech' | 'medical' | 'crypto' | 'mta' | 'anomalous';
}

export const ACROSS_ADS: AdDefinition[] = [
  { h: 'INJURED ON TRANSIT?', sub: '1-800-SUB-HURT', body: 'Attorneys who ride with you through every loop.', bg: '#1c2833', fg: '#f4d03f' },
  { h: 'SLEEPLESS COMMUTE?', sub: 'NIGHTSHADOW CLINIC', body: 'Are you sure you woke up this morning?', bg: '#141414', fg: '#e74c3c' },
  { h: 'REPORT IRREGULARITIES', sub: 'MTA TRANSIT POLICE', body: 'If you see an anomaly, do not look away.', bg: '#0b2545', fg: '#ffffff' },
  { h: 'BROADWAY JUNCTION', sub: 'NEW LUXURY RESIDENCES', body: 'Units overlooking the permanent fog.', bg: '#1b3b22', fg: '#d4efdf' },
  { h: 'LEARN TO CODE THE VOID', sub: 'CYBER-INSTITUTE', body: 'Classes in terminal assembly and signal decoding.', bg: '#2c3e50', fg: '#3498db' },
];

export const NEAR_ADS: AdDefinition[] = [
  { h: 'DRINK CEL-RAY', sub: 'A BROOKLYN TRADITION', body: 'Pure botanical crispness since 1869.', bg: '#194d33', fg: '#a9dfbf' },
  { h: 'STAY BEHIND THE LINE', sub: 'PASSENGER NOTICE', body: 'The yellow tactile strip is not a sanctuary.', bg: '#7d6608', fg: '#f9e79f' },
  { h: 'FORGOTTEN BAGGAGE?', sub: 'LOST & FOUND ARCHIVE', body: 'Items held permanently at Court Sq.', bg: '#4a235a', fg: '#ebdef0' },
  { h: 'DR. VANCE OPTOMETRY', sub: 'CAN YOU STILL FOCUS?', body: 'Eye exams and corrective lenses for dilated pupils.', bg: '#1b2631', fg: '#85929e' },
];

export const SEGS: SegmentDef[] = [
  { stop: 1, anoms: 0, type: 'real' },
  { stop: 2, anoms: 1, type: 'real' },
  { stop: 3, anoms: 1, type: 'real' },
  { stop: 4, anoms: 1, type: 'real' },
  { stop: 5, anoms: 1, type: 'real' },
  { stop: 6, anoms: 0, type: 'haven' }, // Safe haven
  { stop: 6, b: true, anoms: 1, type: 'real' },
  { stop: 7, anoms: 1, type: 'real' },
  { stop: 8, anoms: 1, type: 'real' },
  { stop: 9, anoms: 1, type: 'real' },
  { stop: 10, anoms: 1, type: 'real' },
  { stop: 11, anoms: 1, type: 'real', restraint: true },
  { stop: 12, anoms: 1, type: 'false', bait: true },
  { stop: 13, anoms: 0, type: 'real', final: true },
];

export const BANDS: Array<{ stop: number; lo: number; hi: number; name: string }> = [
  { stop: 1, lo: 90, hi: 100, name: 'Normal' },
  { stop: 2, lo: 82, hi: 98, name: 'Normal' },
  { stop: 3, lo: 75, hi: 94, name: 'Normal' },
  { stop: 4, lo: 68, hi: 90, name: 'Normal' },
  { stop: 5, lo: 60, hi: 86, name: 'Mild' },
  { stop: 6, lo: 55, hi: 84, name: 'Mild' },
  { stop: 7, lo: 50, hi: 80, name: 'Medium' },
  { stop: 8, lo: 45, hi: 76, name: 'Medium' },
  { stop: 9, lo: 40, hi: 72, name: 'Medium' },
  { stop: 10, lo: 35, hi: 68, name: 'Critical' },
  { stop: 11, lo: 30, hi: 64, name: 'Critical' },
  { stop: 12, lo: 25, hi: 60, name: 'Critical' },
  { stop: 13, lo: 20, hi: 55, name: 'Terminal' },
];

export const SAN = {
  max: 100,
  flagDrain: 0.8,
  anomalySightDrain: 2.2,
  glitchDrain: 3.5,
  havenBonus: 12,
  trialDrain: 8,
  drift: 0.05,
  clock: 0.1,
  miss: 15,
  falsePos: 8,
  haven: 15,
  timeout: 12,
  maskFail: 18,
  intervention: 20,
  restraintOK: 5,
  restraintFail: 15,
  trial: 10,
};

export const SUS = {
  max: 100,
  intervene: 50,
  decay: 1.2,
  flagCharge: 2.5,
  cameraFlash: 8.0,
  prolongedLook: 4.5,
  clean: 5,
  falsePos: 12,
  refuseHaven: 10,
  maskFail: 20,
  timeout: 15,
  visible: 0.8,
};

export const TIER_NAMES = ['High', 'Medium', 'Low', 'Critical'] as const;

export function tierOf(san: number): number {
  if (san >= 75) return 0;
  if (san >= 50) return 1;
  if (san >= 25) return 2;
  return 3;
}

export const BREATH_MAX_FLAGS = 3;
export const BREATH_PER_FLAG_DEG = 4.0;

export interface BreathTierDef {
  depthDeg: number;
  bpm: number;
}
export const BREATH_TIERS: (BreathTierDef | null)[] = [
  null,
  { depthDeg: 0.8, bpm: 72 },
  { depthDeg: 1.6, bpm: 90 },
  { depthDeg: 2.8, bpm: 116 },
];

export interface GlitchTierDef {
  strength: [number, number];
  duration: [number, number];
  decoyEvery: [number, number];
}
export const GLITCH_TIERS: (GlitchTierDef | null)[] = [
  null,
  null,
  { strength: [0.15, 0.35], duration: [0.1, 0.3], decoyEvery: [15, 30] },
  { strength: [0.35, 0.75], duration: [0.2, 0.55], decoyEvery: [8, 18] },
];

export const HEART_BPM = [68, 84, 108, 136];
export const HEART_JITTER = [2, 4, 7, 12];
export const INTERCOM_EVERY: [number, number] = [28, 55];
export const INTERCOM_FIRST = 8;
export const INTERCOM_MIN_ROOM = 6;
export const INTERCOM_RETRY = 14;

export const RESTRAINT_GRACE = 1.4;
export const RESTRAINT_RAISE = 5.5;

export const TA = 3.5;
export const TD = 3.5;
export const V = 18.0;
export const DRIFT = 0.001;

export const CHATS: Record<number, [number, string][]> = {
  1: [[0, "Don't lean against the doors."], [1, "Should be in Queens in twenty minutes."]],
  3: [[0, "Did they change the schedule?"], [1, "It feels slower today."]],
  5: [[0, "I always hated this curve."], [1, "Check your bag."]],
  7: [[0, "Did someone turn down the heat?"], [1, "Why did the lights dip just now?"]],
  9: [[0, "Are you still with us?"], [1, "Just look straight ahead."]],
  11: [[0, "Don't move. Don't look at them."], [1, "Keep holding."]],
};

export interface MaskDialogueDef {
  who: number;
  line: string;
  calm: string;
  off: [string, string];
  needsSus?: boolean;
}

export const MASK_DIALOGUES: Record<number, MaskDialogueDef[]> = {
  0: [
    { who: 0, line: 'Did you drop something on the floor?', calm: 'No, just adjusting my bag.', off: ['Why are you staring?', 'Leave me alone.'], needsSus: false },
    { who: 1, line: 'Almost there, right?', calm: 'A couple more stops.', off: ['I have no idea.', 'Don’t talk to me.'], needsSus: false },
  ],
  1: [
    { who: 0, line: 'You’ve been pacing since Hoyt.', calm: 'Just stretching my legs.', off: ['Stop watching me.', 'Who told you that?'], needsSus: true },
    { who: 1, line: 'Your hands are shaking.', calm: 'It’s cold in this car.', off: ['They aren’t shaking.', 'Look away.'], needsSus: false },
  ],
  2: [
    { who: 0, line: 'You don’t belong in this car.', calm: 'Just trying to reach Court Sq.', off: ['Neither do you.', 'I know what you are.'], needsSus: true },
    { who: 1, line: 'Don’t look at the windows.', calm: 'I’m looking right ahead.', off: ['What’s out there?', 'Let me off!'], needsSus: false },
  ],
};

export const PARANOID_UI_WORDS = [
  'WATCHING',
  'DON’T LOOK',
  'LOOPING',
  'HOLD',
  'WRONG TRAIN',
  'EMPTY CAR',
];
