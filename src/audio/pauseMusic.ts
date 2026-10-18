/**
 * Pause-menu music for Court Sq-Bound.
 *
 * A slow, warm electric-piano loop (Fmaj7 – Em7 – Dm7 – Cmaj7) generated with Web Audio,
 * no audio files. It degrades with the player's sanity tier, so even the pause menu
 * stops feeling safe:
 *   High      clean and in tune
 *   Medium    faintly detuned
 *   Low       notes drift, tempo wobbles
 *   Critical  slower, sagging pitch, the occasional wrong note
 */

interface MusicTier {
  bpm: number;
  detuneCents: number; // random +/- per note
  driftCents: number; // slow sine drift of the whole loop
  wobble: number; // random timing variation per step (fraction of a step)
  wrongChance: number; // chance an arpeggio note lands a semitone or tritone off
  sagCentsPerBar: number; // tape-slowing pitch sag, accumulates per bar
  sagMaxCents: number;
}

export const MUSIC_TIERS: MusicTier[] = [
  { bpm: 72, detuneCents: 0, driftCents: 0, wobble: 0, wrongChance: 0, sagCentsPerBar: 0, sagMaxCents: 0 },
  { bpm: 70, detuneCents: 10, driftCents: 0, wobble: 0.02, wrongChance: 0, sagCentsPerBar: 0, sagMaxCents: 0 },
  { bpm: 66, detuneCents: 18, driftCents: 30, wobble: 0.08, wrongChance: 0, sagCentsPerBar: 0, sagMaxCents: 0 },
  { bpm: 54, detuneCents: 25, driftCents: 45, wobble: 0.12, wrongChance: 0.12, sagCentsPerBar: -8, sagMaxCents: -70 },
];

// One bar per chord, MIDI note numbers. IV – iii – ii – I in C major.
const PROGRESSION: number[][] = [
  [53, 57, 60, 64], // Fmaj7
  [52, 55, 59, 62], // Em7
  [50, 53, 57, 60], // Dm7
  [48, 52, 55, 59], // Cmaj7
];
// Eighth-note arpeggio over the chord tones, an octave up.
const ARP = [0, 2, 1, 3, 2, 1, 3, 2];
const STEPS_PER_BAR = 8;

const LOOKAHEAD_S = 0.25;
const TICK_MS = 50;
const FADE_TC = 0.3; // setTargetAtTime time constant: ~1 s to settle

export interface PauseMusicStats {
  notes: number;
  wrongNotes: number;
  maxAbsDetune: number;
  bars: number;
}

export class PauseMusic {
  private ac: AudioContext;
  private bus: GainNode;
  private timer: number | null = null;
  private stopTimer: number | null = null;
  private tier: MusicTier = MUSIC_TIERS[0];
  private tierIndex = 0;
  private nextStepTime = 0;
  private step = 0;
  private bar = 0;
  private startTime = 0;
  public playing = false;
  public stats: PauseMusicStats = { notes: 0, wrongNotes: 0, maxAbsDetune: 0, bars: 0 };

  constructor(ac: AudioContext, destination: AudioNode) {
    this.ac = ac;
    this.bus = ac.createGain();
    this.bus.gain.value = 0;
    this.bus.connect(destination);
  }

  public get currentTier(): number {
    return this.tierIndex;
  }

  public start(tierIndex: number) {
    const idx = Math.max(0, Math.min(MUSIC_TIERS.length - 1, tierIndex | 0));
    if (this.stopTimer !== null) {
      clearTimeout(this.stopTimer);
      this.stopTimer = null;
    }
    this.tierIndex = idx;
    this.tier = MUSIC_TIERS[idx];
    const now = this.ac.currentTime;
    this.bus.gain.cancelScheduledValues(now);
    this.bus.gain.setTargetAtTime(1, now, FADE_TC);
    if (this.playing) return; // already running: keep the loop going, just re-fade in
    this.playing = true;
    this.stats = { notes: 0, wrongNotes: 0, maxAbsDetune: 0, bars: 0 };
    this.step = 0;
    this.bar = 0;
    this.startTime = now;
    this.nextStepTime = now + 0.15;
    this.timer = window.setInterval(() => this.schedule(), TICK_MS);
    this.schedule();
  }

  /** Fade out over ~1 s, then stop scheduling. */
  public stop() {
    if (!this.playing) return;
    const now = this.ac.currentTime;
    this.bus.gain.cancelScheduledValues(now);
    this.bus.gain.setTargetAtTime(0, now, FADE_TC / 1.5);
    if (this.stopTimer !== null) clearTimeout(this.stopTimer);
    this.stopTimer = window.setTimeout(() => {
      this.stopTimer = null;
      if (this.timer !== null) clearInterval(this.timer);
      this.timer = null;
      this.playing = false;
    }, 1200);
  }

  private stepDuration(): number {
    const base = 60 / this.tier.bpm / 2;
    return base * (1 + this.tier.wobble * (Math.random() * 2 - 1));
  }

  private pitchOffsetCents(t: number): number {
    const T = this.tier;
    const drift = T.driftCents * Math.sin(((t - this.startTime) * 2 * Math.PI) / 9);
    const sag = Math.max(T.sagMaxCents, T.sagCentsPerBar * this.bar);
    const jitter = T.detuneCents * (Math.random() * 2 - 1);
    return drift + sag + jitter;
  }

  private schedule() {
    // Audio clock frozen (context suspended) or advanced: schedule only what's due.
    while (this.nextStepTime < this.ac.currentTime + LOOKAHEAD_S) {
      this.playStep(this.nextStepTime);
      this.nextStepTime += this.stepDuration();
      this.step++;
      if (this.step % STEPS_PER_BAR === 0) {
        this.bar++;
        this.stats.bars = this.bar;
      }
    }
  }

  private playStep(t: number) {
    const chord = PROGRESSION[this.bar % PROGRESSION.length];
    const s = this.step % STEPS_PER_BAR;

    if (s === 0) {
      this.pad(chord, t, (60 / this.tier.bpm) * 4);
      this.epiano(chord[0] - 12, t, 0.07, 2.6);
    }
    if (s === 4) this.epiano(chord[0] - 12, t, 0.05, 1.8);

    let note = chord[ARP[s]] + 12;
    if (this.tier.wrongChance > 0 && Math.random() < this.tier.wrongChance) {
      note += Math.random() < 0.5 ? (Math.random() < 0.5 ? 1 : -1) : 6;
      this.stats.wrongNotes++;
    }
    const vel = s % 2 === 0 ? 0.06 : 0.045;
    this.epiano(note, t, vel, 1.6);
  }

  private freq(midi: number, cents: number): number {
    return 440 * Math.pow(2, (midi - 69) / 12) * Math.pow(2, cents / 1200);
  }

  /** FM electric piano: a sine carrier with a decaying 1:1 modulator and a short high "tine". */
  private epiano(midi: number, t: number, vel: number, dur: number) {
    const cents = this.pitchOffsetCents(t);
    this.stats.notes++;
    this.stats.maxAbsDetune = Math.max(this.stats.maxAbsDetune, Math.abs(cents));
    const f = this.freq(midi, cents);
    const ac = this.ac;

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
    lp.frequency.setValueAtTime(2400, t);

    const amp = ac.createGain();
    amp.gain.setValueAtTime(0.0001, t);
    amp.gain.linearRampToValueAtTime(vel, t + 0.006);
    amp.gain.exponentialRampToValueAtTime(0.0001, t + dur);

    car.connect(lp).connect(amp).connect(this.bus);
    const end = t + dur + 0.05;
    [car, mod, tine].forEach((o) => {
      o.start(t);
      o.stop(end);
    });
  }

  /** Soft sustained chord underneath, two slightly detuned triangles per tone. */
  private pad(chord: number[], t: number, dur: number) {
    const ac = this.ac;
    const lp = ac.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(900, t);
    const amp = ac.createGain();
    amp.gain.setValueAtTime(0.0001, t);
    amp.gain.linearRampToValueAtTime(0.012, t + 0.6);
    amp.gain.setValueAtTime(0.012, t + dur * 0.7);
    amp.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.4);
    lp.connect(amp).connect(this.bus);

    const cents = this.pitchOffsetCents(t);
    chord.forEach((midi) => {
      [-4, 4].forEach((spread) => {
        const o = ac.createOscillator();
        o.type = 'triangle';
        o.frequency.setValueAtTime(this.freq(midi, cents + spread), t);
        o.connect(lp);
        o.start(t);
        o.stop(t + dur + 0.5);
      });
    });
  }
}
