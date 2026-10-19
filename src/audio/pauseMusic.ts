/**
 * Pause-menu music for Court Sq-Bound: the game's tune (theme.ts), clean and calm.
 *
 * The ride plays the same tune coming apart stop by stop (rideMusic.ts). The pause menu is the
 * one place it still sounds the way it used to: slower, in tune, every note where it belongs,
 * at any sanity tier. A pocket of normal; resuming brings back the ride's version where it was.
 *
 * Generated with Web Audio, no audio files.
 */
import { THEME_CHORDS, THEME_MELODY, epianoVoice, padVoice } from './theme';

const BPM = 68;
const STEPS_PER_BAR = 8; // eighth notes
// Soft eighth-note arpeggio over the chord tones, an octave up, under the melody.
const ARP = [0, 2, 1, 3, 2, 1, 3, 2];

const LOOKAHEAD_S = 0.25;
const TICK_MS = 50;
const FADE_TC = 0.3; // setTargetAtTime time constant: ~1 s to settle

export interface PauseMusicStats {
  notes: number;
  melodyNotes: number;
  bars: number;
}

export class PauseMusic {
  private ac: BaseAudioContext;
  private bus: GainNode;
  private timer: number | null = null;
  private stopTimer: number | null = null;
  private nextStepTime = 0;
  private step = 0;
  private bar = 0;
  public playing = false;
  public stats: PauseMusicStats = { notes: 0, melodyNotes: 0, bars: 0 };

  constructor(ac: BaseAudioContext, destination: AudioNode) {
    this.ac = ac;
    this.bus = ac.createGain();
    this.bus.gain.value = 0;
    this.bus.connect(destination);
  }

  public start() {
    if (this.stopTimer !== null) {
      clearTimeout(this.stopTimer);
      this.stopTimer = null;
    }
    const now = this.ac.currentTime;
    this.bus.gain.cancelScheduledValues(now);
    this.bus.gain.setTargetAtTime(1, now, FADE_TC);
    if (this.playing) return; // already running: keep the loop going, just re-fade in
    this.playing = true;
    this.stats = { notes: 0, melodyNotes: 0, bars: 0 };
    this.step = 0;
    this.bar = 0;
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
    return 60 / BPM / 2;
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
    const i = this.bar % THEME_CHORDS.length;
    const chord = THEME_CHORDS[i];
    const s = this.step % STEPS_PER_BAR;
    const beat = 60 / BPM;

    if (s === 0) {
      padVoice(this.ac, this.bus, chord, t, beat * 4, 0.012);
      this.note(chord[0] - 12, t, 0.07, 2.6);
    }
    if (s === 4) this.note(chord[0] - 12, t, 0.05, 1.8);
    this.note(chord[ARP[s]] + 12, t, s % 2 === 0 ? 0.03 : 0.022, 1.4); // the arpeggio, under the tune

    for (const n of THEME_MELODY[i]) {
      if (Math.round(n.at * 2) === s) {
        this.note(n.midi, t, 0.06, n.len * beat + 1.2);
        this.stats.melodyNotes++;
      }
    }
  }

  private note(midi: number, t: number, vel: number, dur: number) {
    this.stats.notes++;
    epianoVoice(this.ac, this.bus, midi, t, vel, dur);
  }
}
