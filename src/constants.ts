/**
 * Tuning values, route segment table, and dialog assets
 * Directly sourced from Court Sq-Bound Master Project Document v5.1 (October 2026)
 */
import { SegmentDef } from './types';

export const V = 14;
export const TA = 5;
export const TD = 6;

export const STOPS = [
  '',
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

// Sanity bands by stop:
// Stops 4-9 have wider mid-game ceilings so skill shows; Stops 10-13 reach Critical by Greenpoint Av
export const BANDS: Record<number, [number, number]> = {
  1: [80, 100],
  2: [80, 100],
  3: [80, 100],
  4: [70, 95],
  5: [50, 85],
  6: [50, 85],
  7: [30, 70],
  8: [30, 70],
  9: [30, 70],
  10: [5, 30],
  11: [0, 9],
  12: [0, 9],
  13: [0, 9],
};

// v5 per-stop drift: drift (-5) only lands where the band ceiling drops from previous stop.
// Where ceiling stays flat, drift is 0, so careful play holds its place in the band.
export const DRIFT: Record<number, number> = {
  2: 0,
  3: 0,
  4: -5,
  5: -5,
  6: 0,
  7: -5,
  8: 0,
  9: 0,
  10: -5,
  11: -5,
  12: 0,
  13: 0,
};

export const RESTRAINT_RAISE = 6; // Holding at Greenpoint lifts the 11-13 ceiling from 9 to 15
export const TIER_NAMES = ['High', 'Medium', 'Low', 'Critical'] as const;

export function tierOf(san: number): number {
  return san >= 75 ? 0 : san >= 40 ? 1 : san >= 10 ? 2 : 3;
}

export const SUS = {
  falsePos: 20,
  maskFail: 15,
  timeout: 8,
  visible: 10,
  clean: -5,
  refuseHaven: 10,
  intervene: 60,
};

export const SAN = {
  drift: -5,
  clock: -2,
  miss: -5,
  falsePos: -3,
  maskFail: -4,
  timeout: -2,
  haven: 15,
  intervention: -5,
  trial: -20,
  restraintFail: -5,
  restraintOK: 8,
};

export const CFG = {
  dwellReact: 1.5,
  snapThresh: 5.5,
  snapArc: 0,
  flagHold: 0.7,
  misleadChance: 0.5,
};

export const SEGS: SegmentDef[] = [
  { stop: 2, anoms: 1, chat: 0 },
  { stop: 3, anoms: 1, mask: [13] },
  { stop: 4, anoms: 1, type: 'false', tick: 'doors', forgiving: true, chat: 1 },
  { stop: 5, anoms: 1, mask: [12], whisper: true },
  { stop: 6, anoms: 1, type: 'haven', chat: 2 },
  { stop: 6, b: true, anoms: 0, forced: ['mapstop'], type: 'false', tick: 'flicker', cruise: 13, silent: true, thin: true },
  { stop: 7, anoms: 2, mask: [14], crowd: true },
  { stop: 8, anoms: 2, mask: [9, 22], crowd: true },
  { stop: 9, anoms: 1, type: 'false', tick: 'doors', paLie: 'This is Court Square. Last stop. Everybody off the train.', chat: 3 },
  { stop: 10, anoms: 1, forced: ['parent'], mask: [16] },
  { stop: 11, anoms: 0, restraint: true, chat: 4 },
  { stop: 12, anoms: 1, forced: ['crit'], type: 'false', tick: 'flicker', bait: true, mask: [11] },
  { stop: 13, anoms: 0, final: true, cruise: 16 },
];

export const CHATS: Array<[number, string][]> = [
  [[1, 'Did you ever call your sister back?'], [0, 'Tonight. Remind me.']],
  [[0, 'Your cousin\u2019s gonna be so tall now.'], [1, 'Everybody\u2019s tall now.']],
  [[1, 'We should\u2019ve taken the bus.'], [0, 'The bus takes forever.']],
  [[0, 'Did you ever call your sister back?'], [1, 'Did you ever call your sister back?']],
  [[1, 'Is it always this empty?'], [0, 'It\u2019s always this empty.']],
];

export interface MaskDialogue {
  who: number; // 0: Mom, 1: Dad
  line: string;
  calm: string;
  off: [string, string];
  needsSus?: boolean;
}

export const MASK_DIALOGUES: MaskDialogue[][] = [
  // High tier (Calm set)
  [
    { who: 0, line: "You've been quiet. You okay, hon?", calm: 'Yeah, just tired.', off: ['Why? Do I look weird?', 'Did the lights just change?'] },
    { who: 1, line: 'How many more stops, you think?', calm: 'A few. We\u2019re fine.', off: ['Why are you asking me?', 'Wait, which train is this?'] },
    { who: 0, line: 'Did you eat anything today?', calm: 'Had a bagel earlier.', off: ['Why does everyone keep asking that?', 'Sorry, what?'] },
    { who: 0, line: 'You look warm. Are you warm?', calm: 'Just stuffy in here.', off: ['Is it hot to you?', 'Stop looking at me like that.'] },
    { who: 1, line: 'You\u2019re staring at something.', calm: 'Just zoning out.', off: ['No I\u2019m not.', 'Don\u2019t you see it?'], needsSus: true },
  ],
  // Medium/Low tier (Uneasy set)
  [
    { who: 1, line: 'You\u2019d tell us if something was wrong, right?', calm: 'Of course.', off: ['Would you tell me?', 'Define wrong.'] },
    { who: 0, line: 'Why do you keep looking over there?', calm: 'Thought I saw someone I knew.', off: ['You saw it too?', 'Over where?'] },
    { who: 1, line: 'You\u2019re staring at something.', calm: 'Just zoning out.', off: ['No I\u2019m not.', 'Don\u2019t you see it?'], needsSus: true },
  ],
  // Critical tier (Wrong set)
  [
    { who: 0, line: 'You can see it too, can\u2019t you?', calm: 'See what?', off: ['Yes.', 'Don\u2019t.'] },
    { who: 1, line: 'We\u2019re not getting off. You know that.', calm: 'I know.', off: ['Why would you say that?', 'Who said we were?'] },
    { who: 0, line: 'Who are you looking for?', calm: 'Nobody. Just looking.', off: ['The people who were here.', 'You.'] },
  ],
];

export const PARANOID_UI_WORDS = [
  'they\u2019re not your parents',
  'don\u2019t answer',
  'it\u2019s watching you',
  'wrong wrong wrong',
  'who is she',
  'get off get off',
  'you saw it',
  'SAY NOTHING',
];

export const SWAP_CHAR_MAP: Record<string, string> = {
  E: 'F', F: 'E', O: 'Q', Q: 'O', N: 'M', M: 'N',
  C: 'G', G: 'C', I: 'L', L: 'I', R: 'P', P: 'R',
  D: 'O', U: 'V', V: 'U', T: 'I', H: 'N', B: 'R',
  Y: 'V', W: 'V',
};

export interface AdDefinition {
  h: string;
  warp?: string;
  sub: string;
  fine: string;
  bg: string;
  fg: string;
  ac: string;
  alt?: string;
  logoType?: 'bank' | 'tooth' | 'bed' | 'wrench' | 'courtesy' | 'diner' | 'tax' | 'cross' | 'book';
}

export const ACROSS_ADS: AdDefinition[] = [
  {
    h: 'GREENPOINT SAVINGS',
    warp: 'GREENPOINT SAVES US',
    sub: 'Your money. Closer to home.',
    fine: 'Branches in Brooklyn and Queens',
    bg: '#143c2b',
    fg: '#f3efe2',
    ac: '#d9b54a',
    alt: '#6e1c1c',
    logoType: 'bank',
  },
  {
    h: 'KESSLER DENTAL',
    warp: 'KESSLER DENIAL',
    sub: 'Smile like you mean it.',
    fine: 'New patients welcome, evenings too',
    bg: '#f2efe6',
    fg: '#1d2a3a',
    ac: '#2b75b8',
    alt: '#cfe4c4',
    logoType: 'tooth',
  },
  {
    h: 'HALLORAN MATTRESS',
    warp: 'HALLORAN MATTERS',
    sub: "Sleep like nothing's wrong.",
    fine: 'Free delivery to Brooklyn and Queens',
    bg: '#1e2248',
    fg: '#f5f1e4',
    ac: '#e0a526',
    alt: '#2b5c3a',
    logoType: 'bed',
  },
  {
    h: 'LEARN A TRADE',
    warp: 'LEARN A TRACE',
    sub: 'Night classes at Borough Tech.',
    fine: 'Electrical, HVAC, welding, carpentry',
    bg: '#dfb738',
    fg: '#121212',
    ac: '#121212',
    alt: '#8cbfe6',
    logoType: 'wrench',
  },
  {
    h: 'COURTESY COUNTS',
    warp: 'COURTESY COUNTS DOWN',
    sub: 'Offer your seat to someone who needs it.',
    fine: 'A message from your fellow riders',
    bg: '#ede9dc',
    fg: '#1e1f1d',
    ac: '#5fad3a',
    alt: '#e8b4b4',
    logoType: 'courtesy',
  },
];

export const NEAR_ADS: AdDefinition[] = [
  {
    h: 'MIDNIGHT DINER',
    sub: 'Open until the last train.',
    fine: 'Myrtle and Willoughby',
    bg: '#541c21',
    fg: '#f6eee0',
    ac: '#f0c24b',
    logoType: 'diner',
  },
  {
    h: 'TAX HELP NOW',
    sub: 'Walk-ins welcome, fast filing.',
    fine: 'Court Sq, second floor',
    bg: '#f4f1e8',
    fg: '#222336',
    ac: '#c64a3a',
    logoType: 'tax',
  },
  {
    h: 'SEE A DOCTOR TODAY',
    sub: 'Same-day visits, most insurance.',
    fine: 'Clinics near every G stop',
    bg: '#255e78',
    fg: '#ffffff',
    ac: '#8eddfa',
    logoType: 'cross',
  },
  {
    h: 'READ MORE',
    sub: 'Your library card is completely free.',
    fine: 'Brooklyn Public Library',
    bg: '#ebe0c0',
    fg: '#2a2418',
    ac: '#8a5a2b',
    logoType: 'book',
  },
];
