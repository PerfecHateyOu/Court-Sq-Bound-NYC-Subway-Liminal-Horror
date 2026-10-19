/**
 * The ride's music: the game's tune (theme.ts) coming over the train's speakers, slowly going
 * wrong stop by stop. It doesn't get scarier or louder; it gets less: a familiar thing coming
 * apart.
 *
 *   Stops 1–3   Comfort   the tune, clean: warm e-piano, pad, bass, soft brushes.
 *   Stops 4–6   Unease    the long A4 of the opening phrase goes a little flat (more each
 *                         stop), a note now and then lands late, an electrical hum creeps in.
 *   Stops 7–9   Dread     the brushes are gone; notes go missing, some hang on too long, the
 *                         opening phrase comes back at the wrong time, and the tempo drifts
 *                         out of step with the train.
 *   Stops 10–13 Almost    only pieces of the opening phrase, slowed and sagging, with long gaps.
 *               nothing   Greenpoint Av goes silent from the chapter card until the restraint is
 *                         over; when the tune returns it has turned minor. The last stretch cuts
 *                         out completely before Court Sq.
 *
 * It runs on game time (update(dt) from the game loop), so pausing freezes it mid-phrase and
 * resuming carries on from the same note. It ducks for the doors at every stop and nearly
 * vanishes under PA announcements (the same speakers) and while you listen to the recorder.
 * The pause menu plays the clean tune (pauseMusic.ts); mute and the Music volume cover both.
 */
import {
  THEME_CHORDS,
  THEME_MELODY,
  MARKED_NOTE,
  BEATS_PER_BAR,
  midiFreq,
  toMinor,
  seededRandom,
  epianoVoice,
  padVoice,
} from './theme';

export interface StopMusic {
  bpm: number;
  /** Overall level. Never rises from one stop to the next: taking sound away is the point. */
  level: number;
  /** Cents on the opening phrase's long A4 (the first note to go wrong). */
  marked: number;
  /** Chance a melody note lands a sixteenth late. */
  slip: number;
  /** Electrical hum under the speaker (0–1). */
  hum: number;
  /** Brush percussion level (0 = gone). */
  perc: number;
  bass: number;
  pad: number;
  /** Chance a melody note is missing. */
  drop: number;
  /** Chance a note hangs on about three times too long. */
  stretch: number;
  /** Chance, at a bar line, that the opening phrase comes back at the wrong time. */
  wrongReturn: number;
  /** Tempo drift: the music falls out of step with the train. */
  wobble: number;
  /** Only pieces of the opening phrase, with long gaps. */
  fragments: boolean;
  /** Whole-tune pitch sag in cents. */
  sag: number;
  /** The speaker's top end (it fails as the ride goes on). */
  speakerHz: number;
  /** Speaker distortion (0–1). */
  drive: number;
}

const CLEAN: StopMusic = {
  bpm: 84, level: 1, marked: 0, slip: 0, hum: 0, perc: 1, bass: 1, pad: 1, drop: 0, stretch: 0,
  wrongReturn: 0, wobble: 0, fragments: false, sag: 0, speakerHz: 5200, drive: 0,
};

/** Index = stop (1–13). */
export const STOP_MUSIC: StopMusic[] = [
  CLEAN, // (unused 0)
  CLEAN,
  CLEAN,
  CLEAN,
  { ...CLEAN, level: 0.95, marked: -18, slip: 0.04, hum: 0.25, perc: 0.9, pad: 0.95, speakerHz: 4600, drive: 0.05 },
  { ...CLEAN, level: 0.9, marked: -28, slip: 0.07, hum: 0.4, perc: 0.75, bass: 0.9, pad: 0.9, speakerHz: 4200, drive: 0.1 },
  { ...CLEAN, level: 0.85, marked: -38, slip: 0.1, hum: 0.55, perc: 0.6, bass: 0.8, pad: 0.85, speakerHz: 3800, drive: 0.15 },
  { ...CLEAN, bpm: 80, level: 0.7, marked: -45, slip: 0.1, hum: 0.6, perc: 0, bass: 0.5, pad: 0.7, drop: 0.18, stretch: 0.1, wrongReturn: 0.12, wobble: 0.02, speakerHz: 3200, drive: 0.25 },
  { ...CLEAN, bpm: 78, level: 0.62, marked: -50, slip: 0.12, hum: 0.65, perc: 0, bass: 0.3, pad: 0.6, drop: 0.28, stretch: 0.15, wrongReturn: 0.18, wobble: 0.03, speakerHz: 2800, drive: 0.3 },
  { ...CLEAN, bpm: 76, level: 0.55, marked: -55, slip: 0.14, hum: 0.7, perc: 0, bass: 0, pad: 0.5, drop: 0.38, stretch: 0.2, wrongReturn: 0.25, wobble: 0.04, speakerHz: 2500, drive: 0.35 },
  { ...CLEAN, bpm: 64, level: 0.45, marked: -60, slip: 0.1, hum: 0.7, perc: 0, bass: 0, pad: 0.3, drop: 0.3, stretch: 0.35, wobble: 0.05, fragments: true, sag: -35, speakerHz: 2000, drive: 0.4 },
  { ...CLEAN, bpm: 60, level: 0.4, marked: -60, slip: 0.1, hum: 0.6, perc: 0, bass: 0, pad: 0.2, drop: 0.35, stretch: 0.4, wobble: 0.05, fragments: true, sag: -45, speakerHz: 1800, drive: 0.45 },
  { ...CLEAN, bpm: 58, level: 0.35, marked: -60, slip: 0.1, hum: 0.5, perc: 0, bass: 0, pad: 0.15, drop: 0.45, stretch: 0.45, wobble: 0.05, fragments: true, sag: -55, speakerHz: 1700, drive: 0.5 },
  { ...CLEAN, bpm: 56, level: 0.3, marked: -60, slip: 0.1, hum: 0.4, perc: 0, bass: 0, pad: 0.1, drop: 0.5, stretch: 0.5, wobble: 0.05, fragments: true, sag: -65, speakerHz: 1600, drive: 0.55 },
];

export const musicFor = (stop: number): StopMusic => STOP_MUSIC[Math.max(1, Math.min(13, Math.round(stop) || 1))];
/** 0 Comfort (1–3), 1 Unease (4–6), 2 Dread (7–9), 3 Almost nothing (10–13). */
export const stageOf = (stop: number): number => (stop <= 3 ? 0 : stop <= 6 ? 1 : stop <= 9 ? 2 : 3);

/** What the game tells the music each frame. */
export interface RideMusicCue {
  /** The stop the train is heading to (1 during the intro). */
  stop: number;
  phase: string;
  /** The last seconds before a stop: the music steps back before the doors. */
  approach: boolean;
  /** A PA announcement is on: it comes over the same speakers. */
  announcing: boolean;
  /** The recorder is up or a tape is playing. */
  listening: boolean;
  /** One of the planned silences (Greenpoint Av until the restraint is over; the end of the ride). */
  hush: boolean;
  /** After the Greenpoint silence the tune comes back changed (minor). */
  minor: boolean;
}

interface MusicEvent {
  beat: number;
  kind: 'lead' | 'pad' | 'bass' | 'brush';
  midi?: number;
  chord?: number[];
  len: number;
  vel: number;
  cents: number;
}

export interface RideMusicStats {
  bars: number;
  notes: number;
  /** Notes per stop, and how many of each kind of wrongness, so tests can hear the arc. */
  byStop: Record<number, { notes: number; marked: number[]; slipped: number; dropped: number; stretched: number; returns: number; brush: number; bass: number; silentBars: number; minor: number; bars: number }>;
}

const BASE_LEVEL = 0.32; // under the train, never over it (its peaks sit at about the bed's level)
const LOOKAHEAD_S = 0.3;
const FADE_TC = 0.45;

export class RideMusic {
  private ac: BaseAudioContext;
  private voices: GainNode; // everything the "speaker" plays
  private hp: BiquadFilterNode;
  private lp: BiquadFilterNode;
  private shaper: WaveShaperNode;
  private dry: GainNode;
  private wet: GainNode;
  private levelGain: GainNode;
  private pauseGain: GainNode;
  private humGain: GainNode;
  private humStarted = false;
  private humTarget = 0;

  private rand = seededRandom(1);
  /** Musical position in beats. Advances with game time only. */
  public pos = 0;
  private nextBarBeat = 0;
  private chordIdx = 0;
  private lastFragmentBar = -9;
  private queue: MusicEvent[] = [];
  private stop = 1;
  private cue: RideMusicCue | null = null;
  private wobbleT = 0;
  private drive = -1;
  /** Current target level (after ducking); 0 when nothing should be heard. */
  public target = 0;
  public stats: RideMusicStats = { bars: 0, notes: 0, byStop: {} };

  constructor(ac: BaseAudioContext, destination: AudioNode) {
    this.ac = ac;
    this.voices = ac.createGain();
    this.hp = ac.createBiquadFilter();
    this.hp.type = 'highpass';
    this.hp.frequency.value = 220;
    this.lp = ac.createBiquadFilter();
    this.lp.type = 'lowpass';
    this.lp.frequency.value = CLEAN.speakerHz;
    this.shaper = ac.createWaveShaper();
    // The failing speaker: a clean path and a saturated one, blended by how far gone it is.
    // The saturated path is driven hard into a tanh curve and brought back to the clean path's
    // small-signal level, so blending adds grit but never loudness.
    const n = 1024;
    const curve = new Float32Array(n);
    for (let i = 0; i < n; i++) curve[i] = Math.tanh(((i / (n - 1)) * 2 - 1) * 3) / Math.tanh(3);
    this.shaper.curve = curve;
    const preDrive = ac.createGain();
    preDrive.gain.value = 3; // the voices peak near 0.1: this pushes them into the curve's knee
    const postDrive = ac.createGain();
    postDrive.gain.value = Math.tanh(3) / (3 * 3); // the curve is ~3x steep at zero: undo pre and slope
    this.dry = ac.createGain();
    this.wet = ac.createGain();
    this.dry.gain.value = 1;
    this.wet.gain.value = 0;
    this.levelGain = ac.createGain();
    this.levelGain.gain.value = 0;
    this.pauseGain = ac.createGain();
    this.pauseGain.gain.value = 1;
    this.humGain = ac.createGain();
    this.humGain.gain.value = 0;
    this.voices.connect(this.hp).connect(this.lp);
    this.lp.connect(this.dry).connect(this.levelGain);
    this.lp.connect(preDrive).connect(this.shaper).connect(postDrive).connect(this.wet).connect(this.levelGain);
    this.humGain.connect(this.levelGain);
    this.levelGain.connect(this.pauseGain).connect(destination);
    this.setDrive(0);
  }

  /** A new ride: back to the top of the tune, fresh (seeded) imperfections. */
  public reset(seed = Math.floor(Math.random() * 2 ** 31)) {
    this.rand = seededRandom(seed);
    this.pos = 0;
    this.nextBarBeat = 0;
    this.chordIdx = 0;
    this.lastFragmentBar = -9;
    this.queue = [];
    this.stop = 1;
    this.wobbleT = 0;
    this.target = 0;
    this.humTarget = 0;
    this.humGain.gain.setTargetAtTime(0, this.ac.currentTime, 0.1);
    this.stats = { bars: 0, notes: 0, byStop: {} };
    const now = this.ac.currentTime;
    this.levelGain.gain.cancelScheduledValues(now);
    this.levelGain.gain.setTargetAtTime(0, now, 0.1);
  }

  /** Pause menu: the ride's music steps out (the pause menu has its own clean version). */
  public setPaused(paused: boolean) {
    const now = this.ac.currentTime;
    this.pauseGain.gain.cancelScheduledValues(now);
    this.pauseGain.gain.setTargetAtTime(paused ? 0 : 1, now, paused ? 0.1 : 0.35);
  }

  public get stage(): number {
    return stageOf(this.stop);
  }

  /** Called every frame the game runs (never while paused), with game seconds. */
  public update(dt: number, cue: RideMusicCue) {
    this.cue = cue;
    const running = cue.phase !== 'menu' && cue.phase !== 'end';
    const p = musicFor(cue.stop);
    if (cue.stop !== this.stop) {
      this.stop = cue.stop;
      this.applySpeaker(p);
    }

    // Level: the stop's level, ducked for whatever needs the speakers or the player's ears.
    let duck = 0;
    if (cue.phase === 'ride') duck = 1;
    else if (cue.phase === 'stop') duck = 0.25; // the doors are the cue at a stop
    if (cue.approach) duck *= 0.5;
    if (cue.announcing) duck *= 0.3;
    if (cue.listening) duck *= 0.25;
    if (cue.hush) duck = 0;
    const target = running ? BASE_LEVEL * p.level * duck : 0;
    if (Math.abs(target - this.target) > 1e-4) {
      this.target = target;
      const now = this.ac.currentTime;
      this.levelGain.gain.cancelScheduledValues(now);
      this.levelGain.gain.setTargetAtTime(target, now, cue.hush ? 0.25 : FADE_TC);
    }
    this.updateHum(p, running);
    if (!running || dt <= 0) return;

    // Musical time moves with game time (frozen while paused), drifting when the tune slips
    // out of step with the train.
    this.wobbleT += dt;
    const rate = (p.bpm / 60) * (1 + p.wobble * Math.sin((this.wobbleT * 2 * Math.PI) / 7));
    this.pos += dt * rate;
    const la = LOOKAHEAD_S * rate;
    while (this.nextBarBeat <= this.pos + la) this.composeBar(p);
    this.flush(rate);
  }

  private bucket() {
    return (this.stats.byStop[this.stop] ??= { notes: 0, marked: [], slipped: 0, dropped: 0, stretched: 0, returns: 0, brush: 0, bass: 0, silentBars: 0, minor: 0, bars: 0 });
  }

  /** Write the next bar's notes, with this stop's kinds of wrongness. */
  private composeBar(p: StopMusic) {
    const start = this.nextBarBeat;
    this.nextBarBeat += BEATS_PER_BAR;
    const s = this.bucket();
    const r = this.rand;
    const bar = this.stats.bars++;
    s.bars++;
    const chord = THEME_CHORDS[this.chordIdx];
    // Normally the melody follows the chords; later, the opening phrase barges back in.
    let melBar = this.chordIdx;
    if (this.chordIdx !== 0 && p.wrongReturn > 0 && r() < p.wrongReturn) {
      melBar = 0;
      s.returns++;
    }
    this.chordIdx = (this.chordIdx + 1) % THEME_CHORDS.length;
    const minor = !!this.cue?.minor;
    const pitch = (m: number) => {
      const out = minor ? toMinor(m) : m;
      if (out !== m) s.minor++;
      return out;
    };
    const sag = p.sag;

    if (p.fragments) {
      // Almost nothing: now and then a piece of the opening phrase, never two bars running.
      if (bar - this.lastFragmentBar < 2 || r() > 0.5) {
        s.silentBars++;
        if (p.pad > 0 && r() < 0.35) this.push({ beat: start, kind: 'pad', chord: chord.map(pitch), len: BEATS_PER_BAR, vel: 0.012 * p.pad, cents: sag });
        return;
      }
      this.lastFragmentBar = bar;
      const notes = THEME_MELODY[0].slice(0, 2 + Math.floor(r() * 3)); // the first few notes only
      for (const [i, n] of notes.entries()) {
        if (i > 0 && r() < p.drop) {
          s.dropped++;
          continue;
        }
        const marked = i === MARKED_NOTE.index;
        const stretched = r() < p.stretch;
        if (stretched) s.stretched++;
        const cents = sag + (marked ? p.marked : 0) - (r() * 15);
        if (marked) s.marked.push(cents);
        this.push({ beat: start + n.at * 1.4, kind: 'lead', midi: pitch(n.midi), len: n.len * (stretched ? 3 : 1.6), vel: 0.05, cents });
      }
      return;
    }

    // Pad and bass.
    if (p.pad > 0) this.push({ beat: start, kind: 'pad', chord: chord.map(pitch), len: BEATS_PER_BAR, vel: 0.012 * p.pad, cents: sag });
    if (p.bass > 0) {
      for (const b of [0, 2]) {
        this.push({ beat: start + b, kind: 'bass', midi: pitch(chord[0] - 12), len: 1.6, vel: 0.06 * p.bass, cents: sag });
        s.bass++;
      }
    }
    // Brushes on 2 and 4 (soft swishes: nothing that could pass for the doors).
    if (p.perc > 0) {
      for (const b of [1, 3]) {
        if (p.perc < 1 && r() > p.perc) continue;
        this.push({ beat: start + b, kind: 'brush', len: 0.5, vel: 0.02 * p.perc, cents: 0 });
        s.brush++;
      }
    }
    // The melody.
    for (const [i, n] of THEME_MELODY[melBar].entries()) {
      if (p.drop > 0 && !(melBar === 0 && i === 0) && r() < p.drop) {
        s.dropped++;
        continue;
      }
      let at = n.at;
      if (p.slip > 0 && r() < p.slip) {
        at += 0.25;
        s.slipped++;
      }
      const stretched = p.stretch > 0 && r() < p.stretch;
      if (stretched) s.stretched++;
      const marked = melBar === MARKED_NOTE.bar && i === MARKED_NOTE.index;
      const cents = sag + (marked ? p.marked : 0);
      if (marked) s.marked.push(cents);
      this.push({ beat: start + at, kind: 'lead', midi: pitch(n.midi), len: n.len * (stretched ? 3 : 1.25), vel: 0.055, cents });
    }
  }

  private push(e: MusicEvent) {
    this.queue.push(e);
    if (e.kind === 'lead') {
      this.stats.notes++;
      this.bucket().notes++;
    }
  }

  /** Turn due events into sound (skipping any already in the past, e.g. when time jumps). */
  private flush(rate: number) {
    const now = this.ac.currentTime;
    const secPerBeat = 1 / rate;
    const keep: MusicEvent[] = [];
    for (const e of this.queue) {
      const t = now + (e.beat - this.pos) * secPerBeat;
      if (t > now + LOOKAHEAD_S) {
        keep.push(e);
        continue;
      }
      if (t < now - 0.05 || this.target <= 0.0005) continue; // late, or nothing to hear
      this.play(e, Math.max(now, t), secPerBeat);
    }
    this.queue = keep;
  }

  private play(e: MusicEvent, t: number, spb: number) {
    const ac = this.ac;
    const dur = e.len * spb;
    if (e.kind === 'lead' && e.midi !== undefined) epianoVoice(ac, this.voices, e.midi, t, e.vel, Math.max(0.4, dur + 0.6), e.cents, 2200);
    else if (e.kind === 'pad' && e.chord) padVoice(ac, this.voices, e.chord, t, dur, e.vel, e.cents);
    else if (e.kind === 'bass' && e.midi !== undefined) {
      const o = ac.createOscillator();
      o.frequency.setValueAtTime(midiFreq(e.midi, e.cents), t);
      const g = ac.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(e.vel, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g).connect(this.voices);
      o.start(t);
      o.stop(t + dur + 0.05);
    } else if (e.kind === 'brush') {
      // A soft swish: band-passed noise with a slow attack.
      const len = Math.floor(ac.sampleRate * 0.25);
      const buf = ac.createBuffer(1, len, ac.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = (this.rand() * 2 - 1) * (1 - i / len);
      const src = ac.createBufferSource();
      src.buffer = buf;
      const bp = ac.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = 3500;
      bp.Q.value = 0.6;
      const g = ac.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(e.vel, t + 0.03);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
      src.connect(bp).connect(g).connect(this.voices);
      src.start(t);
    }
  }

  private applySpeaker(p: StopMusic) {
    const now = this.ac.currentTime;
    this.lp.frequency.setTargetAtTime(p.speakerHz, now, 1.5);
    this.setDrive(p.drive);
  }

  private setDrive(drive: number) {
    if (drive === this.drive) return;
    const first = this.drive === -1;
    this.drive = drive;
    if (first) {
      this.dry.gain.value = 1 - drive;
      this.wet.gain.value = drive;
      return;
    }
    const now = this.ac.currentTime;
    this.dry.gain.setTargetAtTime(1 - drive, now, 0.8);
    this.wet.gain.setTargetAtTime(drive, now, 0.8);
  }

  /** The electrical hum under the speaker, from Stop 4 on. */
  private updateHum(p: StopMusic, running: boolean) {
    const want = running && p.hum > 0 ? 0.01 * p.hum : 0;
    if (want > 0 && !this.humStarted) {
      this.humStarted = true;
      for (const [f, type, g] of [[60, 'sine', 1], [120, 'triangle', 0.4], [180, 'sine', 0.15]] as const) {
        const o = this.ac.createOscillator();
        o.type = type;
        o.frequency.value = f;
        const gg = this.ac.createGain();
        gg.gain.value = g;
        o.connect(gg).connect(this.humGain);
        o.start();
      }
    }
    if (want !== this.humTarget) {
      this.humTarget = want;
      this.humGain.gain.setTargetAtTime(want, this.ac.currentTime, 1.2);
    }
  }
}
