/**
 * The game's one tune, shared by the pause menu (clean) and the ride (slowly going wrong).
 *
 * A four-bar, local-radio-sounding phrase over IV – iii – ii – I in C major. Keeping a single
 * recognizable melody is the point: the ride never swaps it for "scary music", it just lets the
 * familiar thing come apart (see rideMusic.ts).
 *
 * The melody never steps E5 → C5: that falling third is the door chime (audioEngine.chime), and
 * the chime belongs to the doors.
 */

/** One bar per chord, MIDI note numbers. */
export const THEME_CHORDS: number[][] = [
  [53, 57, 60, 64], // Fmaj7
  [52, 55, 59, 62], // Em7
  [50, 53, 57, 60], // Dm7
  [48, 52, 55, 59], // Cmaj7
];

export interface ThemeNote {
  /** Beat within the bar (4 beats a bar). */
  at: number;
  /** Length in beats. */
  len: number;
  midi: number;
}

/** The melody, one array per bar. Bar 0 is the "opening phrase" the ride keeps coming back to. */
export const THEME_MELODY: ThemeNote[][] = [
  [
    { at: 0, len: 0.5, midi: 72 }, // C5
    { at: 0.5, len: 0.5, midi: 77 }, // F5
    { at: 1, len: 1, midi: 76 }, // E5
    { at: 2, len: 1.5, midi: 69 }, // A4: the long note that goes flat first (MARKED_NOTE)
    { at: 3.5, len: 0.5, midi: 67 }, // G4
  ],
  [
    { at: 0, len: 1, midi: 71 }, // B4
    { at: 1, len: 1, midi: 74 }, // D5
    { at: 2, len: 2, midi: 67 }, // G4
  ],
  [
    { at: 0, len: 0.5, midi: 69 }, // A4
    { at: 0.5, len: 0.5, midi: 72 }, // C5
    { at: 1, len: 1, midi: 77 }, // F5
    { at: 2, len: 0.5, midi: 76 }, // E5
    { at: 2.5, len: 0.5, midi: 74 }, // D5
    { at: 3, len: 1, midi: 69 }, // A4
  ],
  [
    { at: 0, len: 1, midi: 71 }, // B4
    { at: 1, len: 0.5, midi: 67 }, // G4
    { at: 1.5, len: 0.5, midi: 74 }, // D5
    { at: 2, len: 2, midi: 72 }, // C5
  ],
];

/** The note that starts to go wrong first: bar 0, the long A4. */
export const MARKED_NOTE = { bar: 0, index: 3 };

export const BEATS_PER_BAR = 4;

export function midiFreq(midi: number, cents = 0): number {
  return 440 * Math.pow(2, (midi - 69) / 12) * Math.pow(2, cents / 1200);
}

/**
 * The same tune turned minor (E→E♭, A→A♭, B→B♭): how it comes back after the silence at
 * Greenpoint Av. Close enough to recognize, wrong enough to notice.
 */
export function toMinor(midi: number): number {
  const pc = ((midi % 12) + 12) % 12;
  return pc === 4 || pc === 9 || pc === 11 ? midi - 1 : midi;
}

/** Small, seedable random source, so a ride's music is consistent but differs between rides. */
export function seededRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** The electric piano both versions use: an FM sine with a short bright tine. */
export function epianoVoice(
  ac: BaseAudioContext,
  out: AudioNode,
  midi: number,
  t: number,
  vel: number,
  dur: number,
  cents = 0,
  bright = 2400
) {
  const f = midiFreq(midi, cents);
  const car = ac.createOscillator();
  car.frequency.setValueAtTime(f, t);

  const mod = ac.createOscillator();
  mod.frequency.setValueAtTime(f, t);
  const modGain = ac.createGain();
  modGain.gain.setValueAtTime(f * 2.0, t);
  modGain.gain.exponentialRampToValueAtTime(f * 0.25, t + 0.9);
  mod.connect(modGain).connect(car.frequency);

  const tine = ac.createOscillator();
  tine.frequency.setValueAtTime(f * 14, t);
  const tineGain = ac.createGain();
  tineGain.gain.setValueAtTime(f * 0.5, t);
  tineGain.gain.exponentialRampToValueAtTime(1, t + 0.06);
  tine.connect(tineGain).connect(car.frequency);

  const lp = ac.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.setValueAtTime(bright, t);

  const amp = ac.createGain();
  amp.gain.setValueAtTime(0.0001, t);
  amp.gain.linearRampToValueAtTime(vel, t + 0.006);
  amp.gain.exponentialRampToValueAtTime(0.0001, t + dur);

  car.connect(lp).connect(amp).connect(out);
  const end = t + dur + 0.05;
  [car, mod, tine].forEach((o) => {
    o.start(t);
    o.stop(end);
  });
}

/** Soft sustained chord: two slightly detuned triangles per tone. */
export function padVoice(ac: BaseAudioContext, out: AudioNode, chord: number[], t: number, dur: number, level: number, cents = 0) {
  const lp = ac.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.setValueAtTime(900, t);
  const amp = ac.createGain();
  amp.gain.setValueAtTime(0.0001, t);
  amp.gain.linearRampToValueAtTime(level, t + 0.6);
  amp.gain.setValueAtTime(level, t + dur * 0.7);
  amp.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.4);
  lp.connect(amp).connect(out);
  chord.forEach((midi) => {
    [-4, 4].forEach((spread) => {
      const o = ac.createOscillator();
      o.type = 'triangle';
      o.frequency.setValueAtTime(midiFreq(midi, cents + spread), t);
      o.connect(lp);
      o.start(t);
      o.stop(t + dur + 0.5);
    });
  });
}
