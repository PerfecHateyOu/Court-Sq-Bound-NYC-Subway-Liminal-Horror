/**
 * Ambient Audio Loop: 'last-local-announcement'
 * Simulates a distorted, late-night NYC subway conductor voice announcing the
 * 'Last Local' over an overdriven car PA speaker with realistic formants,
 * line transformer buzz, mic pops, and station slapback acoustics.
 */

// Formant target frequencies (F1, F2, F3 in Hz) for spoken vowels
const VOWELS: Record<string, [number, number, number]> = {
  ae: [660, 1720, 2410], // 'Last' [ae]
  ow: [530, 920, 2400],  // 'Lo-' [ow]
  uh: [500, 1100, 2500], // '-cal' / 'the' schwa
  ih: [390, 1990, 2550], // 'This' / 'is'
  ao: [570, 840, 2410],  // 'doors'
  ea: [530, 1840, 2480], // 'clear'
};

interface SyllableDef {
  vowel: keyof typeof VOWELS;
  dur: number;
  pitchMult: number;
  fricativeBefore?: number; // duration of noise burst before vowel (e.g. 's')
  fricativeAfter?: number;  // duration of noise burst after vowel
  fricFreq?: number;
}

// Phonetic timing sequence modeling: "This is the... Last Local... Stand clear of the closing doors..."
const PHRASES: SyllableDef[][] = [
  // Phrase 1: "This is the Last Local"
  [
    { vowel: 'ih', dur: 0.16, pitchMult: 1.0, fricativeBefore: 0.04, fricFreq: 3200 }, // This
    { vowel: 'ih', dur: 0.13, pitchMult: 0.98, fricativeAfter: 0.05, fricFreq: 3800 },  // is
    { vowel: 'uh', dur: 0.11, pitchMult: 0.95 },                                         // the
    { vowel: 'ae', dur: 0.28, pitchMult: 1.06, fricativeBefore: 0.06, fricativeAfter: 0.04, fricFreq: 4200 }, // Last
    { vowel: 'ow', dur: 0.22, pitchMult: 1.02 },                                         // Lo-
    { vowel: 'uh', dur: 0.24, pitchMult: 0.90, fricativeAfter: 0.03, fricFreq: 2600 },  // -cal
  ],
  // Phrase 2: "Stand clear of the closing doors"
  [
    { vowel: 'ae', dur: 0.26, pitchMult: 1.03, fricativeBefore: 0.06, fricFreq: 4000 }, // Stand
    { vowel: 'ea', dur: 0.24, pitchMult: 1.05, fricativeBefore: 0.04, fricFreq: 2800 }, // clear
    { vowel: 'uh', dur: 0.12, pitchMult: 0.96 },                                         // of
    { vowel: 'uh', dur: 0.10, pitchMult: 0.94 },                                         // the
    { vowel: 'ow', dur: 0.20, pitchMult: 0.98, fricativeBefore: 0.04, fricFreq: 3600 }, // clo-
    { vowel: 'ih', dur: 0.13, pitchMult: 0.94, fricativeAfter: 0.04, fricFreq: 3200 },  // -sing
    { vowel: 'ao', dur: 0.32, pitchMult: 0.88, fricativeAfter: 0.05, fricFreq: 2900 },  // doors
  ],
];

export class LastLocalAnnouncementLoop {
  public readonly title = 'last-local-announcement';
  public readonly id = 'last-local-announcement';

  private ac: BaseAudioContext;
  private dest: AudioNode;
  private noise: AudioBuffer | null;
  private outGain: GainNode;
  private filterChainIn: GainNode;
  private shaperCurve: Float32Array<ArrayBuffer>;
  private loopTimer: ReturnType<typeof setTimeout> | null = null;
  private _isPlaying: boolean = false;
  private activeNodes: { stop?: () => void; disconnect?: () => void }[] = [];

  constructor(ac: BaseAudioContext, destination: AudioNode, noiseBuffer: AudioBuffer | null) {
    this.ac = ac;
    this.dest = destination;
    this.noise = noiseBuffer;

    this.outGain = this.ac.createGain();
    this.outGain.gain.setValueAtTime(0, this.ac.currentTime);
    this.outGain.connect(this.dest);

    // Build PA speaker chain:
    // Audio In -> HighPass (350 Hz) -> Peaking EQ (1400 Hz) -> WaveShaper -> LowPass (2800 Hz) -> Delay -> Output
    this.filterChainIn = this.ac.createGain();

    const hp = this.ac.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 360;

    const midPeak = this.ac.createBiquadFilter();
    midPeak.type = 'peaking';
    midPeak.frequency.value = 1450;
    midPeak.Q.value = 2.4;
    midPeak.gain.value = 6.0;

    const drive = this.ac.createGain();
    drive.gain.value = 2.6;

    // Saturation curve
    const n = 512;
    this.shaperCurve = new Float32Array(new ArrayBuffer(n * 4));
    for (let i = 0; i < n; i++) {
      const x = (i / (n - 1)) * 2 - 1;
      this.shaperCurve[i] = Math.tanh(3.2 * x) / Math.tanh(3.2);
    }

    const shaper = this.ac.createWaveShaper();
    shaper.curve = this.shaperCurve as any;
    shaper.oversample = '2x';

    const lp = this.ac.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 2750;

    // Station acoustics slapback echo
    const delay = this.ac.createDelay();
    delay.delayTime.value = 0.11;
    const delayGain = this.ac.createGain();
    delayGain.gain.value = 0.28;

    this.filterChainIn.connect(hp);
    hp.connect(midPeak);
    midPeak.connect(drive);
    drive.connect(shaper);
    shaper.connect(lp);

    lp.connect(this.outGain);
    lp.connect(delay);
    delay.connect(delayGain);
    delayGain.connect(this.outGain);
  }

  public get isPlaying(): boolean {
    return this._isPlaying;
  }

  /**
   * Start the ambient announcement loop.
   */
  public start(t0: number = this.ac.currentTime + 0.1) {
    if (this._isPlaying) return;
    this._isPlaying = true;

    // Fade master bus up smoothly
    this.outGain.gain.cancelScheduledValues(this.ac.currentTime);
    this.outGain.gain.setValueAtTime(0, this.ac.currentTime);
    this.outGain.gain.linearRampToValueAtTime(0.24, this.ac.currentTime + 0.4);

    this.scheduleCycle(t0);
  }

  /**
   * Stop the loop and fade out smoothly without audio clicks.
   */
  public stop(fadeDuration: number = 0.8) {
    if (!this._isPlaying) return;
    this._isPlaying = false;

    if (this.loopTimer) {
      clearTimeout(this.loopTimer);
      this.loopTimer = null;
    }

    const now = this.ac.currentTime;
    this.outGain.gain.cancelScheduledValues(now);
    this.outGain.gain.setValueAtTime(this.outGain.gain.value, now);
    this.outGain.gain.linearRampToValueAtTime(0.0001, now + fadeDuration);

    // Clean up only this cycle's nodes: a start() right after (a restart during the intro)
    // schedules new ones, and the delayed cleanup must not cut those off.
    const nodes = this.activeNodes;
    this.activeNodes = [];
    setTimeout(() => {
      this.cleanupNodes(nodes);
    }, fadeDuration * 1000 + 50);
  }

  private cleanupNodes(nodes: { stop?: () => void; disconnect?: () => void }[] = this.activeNodes) {
    nodes.forEach((node) => {
      try {
        node.stop?.();
        node.disconnect?.();
      } catch {
        /* ignore */
      }
    });
    if (nodes === this.activeNodes) this.activeNodes = [];
  }

  /**
   * Schedules one cycle of the conductor announcement, then sets a timer for the next loop.
   */
  private scheduleCycle(startTime: number) {
    if (!this._isPlaying) return;

    let t = startTime;

    // 1. Mic key-down transient (thump + relay chirp + line hiss)
    this.playMicTransient(t, true);
    t += 0.22;

    // 2. Play Phrase 1: "This is the Last Local"
    t = this.renderPhrase(PHRASES[0], t, 102); // 102 Hz base pitch

    // Brief conductor breath / pause between sentences
    t += 0.45;

    // 3. Play Phrase 2: "Stand clear of the closing doors"
    t = this.renderPhrase(PHRASES[1], t, 98);

    // 4. Mic key-up transient
    this.playMicTransient(t + 0.1, false);
    t += 0.35;

    // Total sequence duration
    const sequenceDuration = t - startTime;

    // Schedule next repetition in the loop (approx 12-16 seconds cycle)
    if (this._isPlaying) {
      const waitMs = Math.max(8000, sequenceDuration * 1000 + 7000);
      this.loopTimer = setTimeout(() => {
        if (this._isPlaying) {
          this.scheduleCycle(this.ac.currentTime + 0.15);
        }
      }, waitMs);
    }
  }

  private playMicTransient(time: number, isKeyDown: boolean) {
    const ac = this.ac;

    // Mechanical contact thump
    const osc = ac.createOscillator();
    const g = ac.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(isKeyDown ? 85 : 120, time);
    osc.frequency.exponentialRampToValueAtTime(30, time + 0.05);

    g.gain.setValueAtTime(0.35, time);
    g.gain.exponentialRampToValueAtTime(0.001, time + 0.06);

    osc.connect(g);
    g.connect(this.filterChainIn);
    osc.start(time);
    osc.stop(time + 0.07);
    this.activeNodes.push(osc, g);

    // Faint relay chirp on key-down
    if (isKeyDown) {
      const chirp = ac.createOscillator();
      const cg = ac.createGain();
      chirp.type = 'sine';
      chirp.frequency.setValueAtTime(2450, time + 0.02);
      chirp.frequency.exponentialRampToValueAtTime(1800, time + 0.05);

      cg.gain.setValueAtTime(0.08, time + 0.02);
      cg.gain.exponentialRampToValueAtTime(0.001, time + 0.06);

      chirp.connect(cg);
      cg.connect(this.filterChainIn);
      chirp.start(time + 0.02);
      chirp.stop(time + 0.07);
      this.activeNodes.push(chirp, cg);
    }

    // Line noise puff
    if (this.noise) {
      const burst = ac.createBufferSource();
      burst.buffer = this.noise;
      const bp = ac.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = 1600;
      bp.Q.value = 3.0;

      const bg = ac.createGain();
      bg.gain.setValueAtTime(0.12, time);
      bg.gain.exponentialRampToValueAtTime(0.001, time + 0.07);

      burst.connect(bp);
      bp.connect(bg);
      bg.connect(this.filterChainIn);
      burst.start(time);
      burst.stop(time + 0.08);
      this.activeNodes.push(burst, bg);
    }
  }

  private renderPhrase(syllables: SyllableDef[], startTime: number, basePitch: number): number {
    const ac = this.ac;
    let t = startTime;

    syllables.forEach((s) => {
      // Unvoiced consonant burst before vowel (e.g. [s] in "Stand" or "Last")
      if (s.fricativeBefore && this.noise) {
        const fric = ac.createBufferSource();
        fric.buffer = this.noise;
        const bp = ac.createBiquadFilter();
        bp.type = 'bandpass';
        bp.frequency.value = s.fricFreq ?? 3800;
        bp.Q.value = 4.0;

        const fg = ac.createGain();
        fg.gain.setValueAtTime(0.09, t);
        fg.gain.linearRampToValueAtTime(0.001, t + s.fricativeBefore);

        fric.connect(bp);
        bp.connect(fg);
        fg.connect(this.filterChainIn);

        fric.start(t);
        fric.stop(t + s.fricativeBefore);
        this.activeNodes.push(fric, fg);

        t += s.fricativeBefore * 0.8;
      }

      // Voiced vowel sound through 3-formant vocal tract
      const formants = VOWELS[s.vowel] || VOWELS.uh;
      const pitch = basePitch * s.pitchMult;

      // Glottal source (sawtooth + subtle sub-octave)
      const voice = ac.createOscillator();
      voice.type = 'sawtooth';
      voice.frequency.setValueAtTime(pitch, t);
      // Natural vocal downward pitch drop at end of syllable
      voice.frequency.exponentialRampToValueAtTime(pitch * 0.94, t + s.dur);

      const voiceGain = ac.createGain();
      voiceGain.gain.setValueAtTime(0.001, t);
      voiceGain.gain.linearRampToValueAtTime(0.42, t + 0.03);
      voiceGain.gain.setValueAtTime(0.42, t + s.dur - 0.04);
      voiceGain.gain.linearRampToValueAtTime(0.001, t + s.dur);

      // Formants F1, F2, F3
      const fGains = [1.0, 0.55, 0.3];
      const fQs = [5.5, 7.5, 10.0];

      for (let i = 0; i < 3; i++) {
        const bp = ac.createBiquadFilter();
        bp.type = 'bandpass';
        bp.frequency.value = formants[i];
        bp.Q.value = fQs[i];

        const fg = ac.createGain();
        fg.gain.value = fGains[i];

        voice.connect(bp);
        bp.connect(fg);
        fg.connect(voiceGain);
      }

      voiceGain.connect(this.filterChainIn);
      voice.start(t);
      voice.stop(t + s.dur);
      this.activeNodes.push(voice, voiceGain);

      t += s.dur;

      // Unvoiced consonant burst after vowel
      if (s.fricativeAfter && this.noise) {
        const fric = ac.createBufferSource();
        fric.buffer = this.noise;
        const bp = ac.createBiquadFilter();
        bp.type = 'bandpass';
        bp.frequency.value = s.fricFreq ?? 3200;
        bp.Q.value = 3.5;

        const fg = ac.createGain();
        fg.gain.setValueAtTime(0.08, t);
        fg.gain.linearRampToValueAtTime(0.001, t + s.fricativeAfter);

        fric.connect(bp);
        bp.connect(fg);
        fg.connect(this.filterChainIn);

        fric.start(t);
        fric.stop(t + s.fricativeAfter);
        this.activeNodes.push(fric, fg);

        t += s.fricativeAfter;
      }

      // Inter-syllable brief breath gap
      t += 0.04;
    });

    return t;
  }

  public dispose() {
    this.stop(0.1);
    try {
      this.outGain.disconnect();
      this.filterChainIn.disconnect();
    } catch {
      /* ignore */
    }
  }
}
