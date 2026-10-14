/**
 * Background subway intercom: distorted, unintelligible announcements, synthesized live.
 *
 * Voice: a buzzy glottal source through three moving vowel formants, with noisy consonant
 * bursts between syllables. It has the rhythm and intonation of speech but no words.
 * Speaker chain: band-limited cheap PA speaker → overdrive → short station echo, with line
 * hiss and a mic-key click at each end.
 *
 * Sanity tier shifts pitch and speed together, like tape slowing down, plus a warble that
 * grows as sanity drops. Subtle at Medium, unmistakable at Critical.
 */

export interface IntercomTier {
  pitch: number; // multiplies voice pitch and formants
  rate: number; // multiplies speaking speed
  wowCents: number; // depth of the slow pitch warble
  wowHz: number;
}

export const INTERCOM_TIERS: IntercomTier[] = [
  { pitch: 1.0, rate: 1.0, wowCents: 0, wowHz: 0 }, // High
  { pitch: 0.97, rate: 0.96, wowCents: 10, wowHz: 0.5 }, // Medium
  { pitch: 0.92, rate: 0.9, wowCents: 25, wowHz: 0.8 }, // Low
  { pitch: 0.85, rate: 0.8, wowCents: 45, wowHz: 1.2 }, // Critical
];

// Vowel formants (Hz): F1, F2, F3.
const VOWELS: Array<[number, number, number]> = [
  [730, 1090, 2440], // a
  [530, 1840, 2480], // e
  [270, 2290, 3010], // i
  [570, 840, 2410], // o
  [300, 870, 2240], // u
  [500, 1500, 2500], // schwa
];
const FORMANT_GAIN = [1.0, 0.55, 0.3];
const FORMANT_Q = [6, 9, 11];

const OUT_LEVEL = 0.05; // background: under the chime and dialogue

const rand = (a: number, b: number) => a + Math.random() * (b - a);
const pick = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];

export class Intercom {
  private ac: BaseAudioContext;
  private dest: AudioNode;
  private noise: AudioBuffer;
  private shaperCurve: Float32Array<ArrayBuffer>;
  /** Last announcement, for tests and the debug overlay. */
  public last: { tier: number; start: number; duration: number; syllables: number } | null = null;

  constructor(ac: BaseAudioContext, destination: AudioNode, noise: AudioBuffer) {
    this.ac = ac;
    this.dest = destination;
    this.noise = noise;
    // Soft-clip curve for the overdriven speaker.
    const n = 1024;
    this.shaperCurve = new Float32Array(new ArrayBuffer(n * 4));
    for (let i = 0; i < n; i++) {
      const x = (i / (n - 1)) * 2 - 1;
      this.shaperCurve[i] = Math.tanh(3 * x) / Math.tanh(3);
    }
  }

  /** Play one announcement starting at time t0 (defaults to now). Returns its duration in seconds. */
  public play(tierIndex: number, t0: number = this.ac.currentTime + 0.05): number {
    const ac = this.ac;
    const tier = INTERCOM_TIERS[Math.max(0, Math.min(3, tierIndex | 0))];

    // ---- speaker chain: voice → bandpass speaker → overdrive → out (+ echo) ----
    const voice = ac.createGain();
    voice.gain.value = 1;
    const hp = ac.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 380;
    const lp = ac.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 3000;
    const drive = ac.createGain();
    drive.gain.value = 2.2;
    const shaper = ac.createWaveShaper();
    shaper.curve = this.shaperCurve;
    const out = ac.createGain();
    out.gain.value = OUT_LEVEL;
    voice.connect(hp).connect(lp).connect(drive).connect(shaper).connect(out).connect(this.dest);

    // Station echo: one short, darkened repeat.
    const echo = ac.createDelay(1);
    echo.delayTime.value = 0.13;
    const echoLp = ac.createBiquadFilter();
    echoLp.type = 'lowpass';
    echoLp.frequency.value = 2200;
    const echoFb = ac.createGain();
    echoFb.gain.value = 0.32;
    out.connect(echo).connect(echoLp).connect(echoFb);
    echoFb.connect(echo);
    echoFb.connect(this.dest);

    // ---- glottal source with phrase intonation ----
    const src = ac.createOscillator();
    src.type = 'sawtooth';

    // Warble: one slow LFO bends the source and the formants together (tape wow).
    let wow: OscillatorNode | null = null;
    let wowDepth: GainNode | null = null;
    if (tier.wowCents > 0) {
      wow = ac.createOscillator();
      wow.frequency.value = tier.wowHz;
      wowDepth = ac.createGain();
      wowDepth.gain.value = tier.wowCents;
      wow.connect(wowDepth).connect(src.detune);
    }

    const amp = ac.createGain();
    amp.gain.value = 0;
    const formants = [0, 1, 2].map((k) => {
      const f = ac.createBiquadFilter();
      f.type = 'bandpass';
      f.Q.value = FORMANT_Q[k];
      const g = ac.createGain();
      g.gain.value = FORMANT_GAIN[k];
      src.connect(f).connect(g).connect(amp);
      if (wowDepth) wowDepth.connect(f.detune);
      return f;
    });
    amp.connect(voice);

    // ---- syllables ----
    const syllables = Math.floor(rand(10, 18));
    const f0Start = 132 * tier.pitch;
    const f0End = 104 * tier.pitch;
    let t = t0 + 0.12; // after the mic click
    let sinceGap = 0;
    for (let s = 0; s < syllables; s++) {
      const dur = rand(0.15, 0.24) / tier.rate;
      const progress = s / syllables;
      // Declining phrase pitch with a lift on stressed syllables.
      const f0 = (f0Start + (f0End - f0Start) * progress) * (Math.random() < 0.25 ? 1.12 : rand(0.95, 1.04));
      src.frequency.setTargetAtTime(f0, t, 0.03);

      const v = pick(VOWELS);
      formants.forEach((f, k) => f.frequency.setTargetAtTime(v[k] * tier.pitch, t, 0.035));

      // Consonant onset on most syllables.
      if (Math.random() < 0.6) this.burst(voice, t, rand(0.035, 0.065) / tier.rate, rand(2600, 4800) * tier.pitch);

      const peak = rand(0.75, 1);
      amp.gain.setTargetAtTime(peak, t + 0.01, 0.018);
      amp.gain.setTargetAtTime(0.18, t + dur * 0.7, 0.03);

      t += dur;
      sinceGap++;
      // Word gaps every 2-4 syllables.
      if (sinceGap >= 2 && Math.random() < 0.45 && s < syllables - 1) {
        const gap = rand(0.07, 0.15) / tier.rate;
        amp.gain.setTargetAtTime(0, t, 0.02);
        t += gap;
        sinceGap = 0;
      }
    }
    amp.gain.setTargetAtTime(0, t, 0.04);
    const end = t + 0.25;

    src.start(t0);
    src.stop(end + 0.1);
    if (wow) {
      wow.start(t0);
      wow.stop(end + 0.1);
    }

    // Line hiss for the whole announcement, and mic-key clicks at both ends.
    this.hiss(t0, end - t0);
    this.click(t0);
    this.click(end);

    const duration = end - t0 + 0.4; // plus the echo tail
    this.last = { tier: INTERCOM_TIERS.indexOf(tier), start: t0, duration, syllables };

    // The echo is a feedback loop; break it once the tail has died so nodes can be collected.
    // (Skipped when rendering offline, where wall-clock timers don't track audio time.)
    if (typeof OfflineAudioContext === 'undefined' || !(ac instanceof OfflineAudioContext)) {
      const ms = (end - ac.currentTime + 2) * 1000;
      setTimeout(() => {
        out.disconnect();
        echoFb.disconnect();
      }, ms);
    }
    return duration;
  }

  private noiseSource(t: number, dur: number): AudioBufferSourceNode {
    const s = this.ac.createBufferSource();
    s.buffer = this.noise;
    s.loop = true;
    s.start(t, Math.random() * Math.max(0, this.noise.duration - 0.1));
    s.stop(t + dur + 0.05);
    return s;
  }

  /** Short filtered-noise consonant, into the voice so it gets the speaker treatment. */
  private burst(into: AudioNode, t: number, dur: number, freq: number) {
    const f = this.ac.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = freq;
    f.Q.value = 1.4;
    const g = this.ac.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.35, t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    this.noiseSource(t, dur).connect(f).connect(g).connect(into);
  }

  private hiss(t: number, dur: number) {
    const f = this.ac.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = 2600;
    f.Q.value = 0.6;
    const g = this.ac.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.012, t + 0.05);
    g.gain.setValueAtTime(0.012, t + dur - 0.05);
    g.gain.linearRampToValueAtTime(0.0001, t + dur);
    this.noiseSource(t, dur).connect(f).connect(g).connect(this.dest);
  }

  private click(t: number) {
    const f = this.ac.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = 1800;
    f.Q.value = 0.8;
    const g = this.ac.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.05, t + 0.002);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.03);
    this.noiseSource(t, 0.04).connect(f).connect(g).connect(this.dest);
  }
}
