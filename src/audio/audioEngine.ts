/**
 * Web Audio Engine for Court Sq-Bound
 * Procedural synthesizers for subway ambience, rumble, track clacks, chimes,
 * curve screeches, whispers, and heartbeats. Zero external audio file dependencies.
 */

import { PauseMusic } from './pauseMusic';

/*
 * Signal chain:
 *   game sounds + bed ─► masterGain (game bus: run level, ducked while paused) ─┐
 *   pause music ──────────────────────────────────────────────────────────────┴► outGain (mute) ─► speakers
 */
export class AudioEngine {
  private ac: AudioContext | null = null;
  private outGain: GainNode | null = null;
  private masterGain: GainNode | null = null;
  private pauseMusic: PauseMusic | null = null;
  private ducked: boolean = false;
  private bedGain: GainNode | null = null;
  private rumbleGain: GainNode | null = null;
  private lpFilter: BiquadFilterNode | null = null;
  private whiteBuffer: AudioBuffer | null = null;
  private brownBuffer: AudioBuffer | null = null;
  private isMuted: boolean = false;
  private masterVolume: number = 0.85;

  public init(startMuted: boolean = false) {
    if (this.ac) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.ac = new AudioCtx();
      this.isMuted = startMuted;

      // Final output: mute lives here so it covers game audio and pause music alike
      this.outGain = this.ac.createGain();
      this.outGain.gain.setValueAtTime(this.isMuted ? 0 : 1, this.ac.currentTime);
      this.outGain.connect(this.ac.destination);

      // Game bus
      this.masterGain = this.ac.createGain();
      this.masterGain.gain.setValueAtTime(this.masterVolume, this.ac.currentTime);
      this.masterGain.connect(this.outGain);

      this.pauseMusic = new PauseMusic(this.ac, this.outGain);

      // Generate White and Brown noise buffers
      const sr = this.ac.sampleRate;
      const brownLen = sr * 3;
      this.brownBuffer = this.ac.createBuffer(1, brownLen, sr);
      const bd = this.brownBuffer.getChannelData(0);
      let lastBrown = 0;
      for (let i = 0; i < brownLen; i++) {
        lastBrown = (lastBrown + 0.02 * (Math.random() * 2 - 1)) / 1.02;
        bd[i] = lastBrown * 3.5;
      }

      const whiteLen = sr * 2;
      this.whiteBuffer = this.ac.createBuffer(1, whiteLen, sr);
      const wd = this.whiteBuffer.getChannelData(0);
      for (let i = 0; i < whiteLen; i++) {
        wd[i] = Math.random() * 2 - 1;
      }

      // Bed bus (hum + train rumble)
      this.bedGain = this.ac.createGain();
      this.bedGain.gain.setValueAtTime(1, this.ac.currentTime);
      this.bedGain.connect(this.masterGain);

      // Lowpass filter for rumble
      this.lpFilter = this.ac.createBiquadFilter();
      this.lpFilter.type = 'lowpass';
      this.lpFilter.frequency.setValueAtTime(300, this.ac.currentTime);

      this.rumbleGain = this.ac.createGain();
      this.rumbleGain.gain.setValueAtTime(0.04, this.ac.currentTime);

      // Loop brown noise source
      const brownSource = this.ac.createBufferSource();
      brownSource.buffer = this.brownBuffer;
      brownSource.loop = true;
      brownSource.connect(this.lpFilter);
      this.lpFilter.connect(this.rumbleGain);
      this.rumbleGain.connect(this.bedGain);
      brownSource.start();

      // Subway traction motor hum harmonics (120Hz 60Hz hum and 240Hz harmonic)
      const hum1 = this.ac.createOscillator();
      hum1.type = 'sine';
      hum1.frequency.setValueAtTime(120, this.ac.currentTime);
      const hum1Gain = this.ac.createGain();
      hum1Gain.gain.setValueAtTime(0.012, this.ac.currentTime);
      hum1.connect(hum1Gain);
      hum1Gain.connect(this.bedGain);
      hum1.start();

      const hum2 = this.ac.createOscillator();
      hum2.type = 'triangle';
      hum2.frequency.setValueAtTime(240, this.ac.currentTime);
      const hum2Gain = this.ac.createGain();
      hum2Gain.gain.setValueAtTime(0.004, this.ac.currentTime);
      hum2.connect(hum2Gain);
      hum2Gain.connect(this.bedGain);
      hum2.start();
    } catch (e) {
      console.warn('AudioContext failed to initialize:', e);
      this.ac = null;
    }
  }

  public wake() {
    if (this.ac && this.ac.state === 'suspended') {
      this.ac.resume().catch(() => {});
    }
  }

  public suspend() {
    if (this.ac && this.ac.state === 'running') {
      this.ac.suspend().catch(() => {});
    }
  }

  public toggleMute(): boolean {
    this.setMute(!this.isMuted);
    return this.isMuted;
  }

  public setMute(muted: boolean) {
    this.isMuted = muted;
    if (this.ac && this.outGain) {
      this.outGain.gain.setTargetAtTime(muted ? 0 : 1, this.ac.currentTime, 0.05);
    }
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  /** Run-level volume of the game bus (e.g. 0.2 on the report screen). Kept while ducked for pause. */
  public setMasterLevel(level: number, rampTime: number = 0.3) {
    this.masterVolume = level;
    if (this.ac && this.masterGain && !this.ducked) {
      this.masterGain.gain.setTargetAtTime(level, this.ac.currentTime, rampTime);
    }
  }

  /**
   * Pause: fade the game out and the pause music in. The music degrades with sanity tier (0-3).
   * The audio context keeps running; use suspend() instead when the tab is hidden.
   */
  public enterPause(tier: number) {
    if (!this.ac || !this.masterGain) return;
    this.ducked = true;
    this.masterGain.gain.setTargetAtTime(0, this.ac.currentTime, 0.12);
    this.pauseMusic?.start(tier);
  }

  /** Resume: fade the music out and the game back in to its run level. */
  public exitPause() {
    if (!this.ac || !this.masterGain) return;
    this.ducked = false;
    this.masterGain.gain.setTargetAtTime(this.masterVolume, this.ac.currentTime, 0.3);
    this.pauseMusic?.stop();
  }

  /** For tests and the debug overlay. */
  public getPauseMusic(): PauseMusic | null {
    return this.pauseMusic;
  }

  public setBedLevel(level: number, rampTime: number = 0.3) {
    if (this.ac && this.bedGain) {
      this.bedGain.gain.setTargetAtTime(level, this.ac.currentTime, rampTime);
    }
  }

  public updateTrainSpeed(speedRatio: number) {
    if (!this.ac || !this.rumbleGain || !this.lpFilter) return;
    const now = this.ac.currentTime;
    const targetRumble = 0.03 + 0.1 * speedRatio;
    const targetLp = 220 + 360 * speedRatio;
    this.rumbleGain.gain.setTargetAtTime(targetRumble, now, 0.15);
    this.lpFilter.frequency.setTargetAtTime(targetLp, now, 0.15);
  }

  public clack() {
    if (!this.ac || !this.masterGain) return;
    const t = this.ac.currentTime;
    [0, 0.12].forEach((offset) => {
      this.noiseHit(t + offset, 0.08, 950, 1.3, 0.28);
      this.noiseHit(t + offset, 0.14, 130, 0.9, 0.5);
    });
  }

  public chime() {
    if (!this.ac || !this.masterGain) return;
    const t = this.ac.currentTime;
    // MTA iconic two-tone chime
    this.tone(659, t, 0.9, 0.07);
    this.tone(523, t + 0.45, 1.25, 0.07);
  }

  public blip() {
    if (!this.ac) return;
    this.tone(740, this.ac.currentTime, 0.12, 0.025, 'triangle');
  }

  /** Lub-dub. The gap shrinks with the beat period so fast heartbeats don't overlap. */
  public thump(period: number = 1.05) {
    if (!this.ac) return;
    const t = this.ac.currentTime;
    const gap = Math.min(0.24, period * 0.38);
    const len = Math.min(0.22, period * 0.35);
    this.tone(52, t, len, 0.22);
    this.tone(48, t + gap, len + 0.03, 0.16);
  }

  public step() {
    if (!this.ac) return;
    const pan = (Math.random() * 2 - 1);
    this.noiseHit(this.ac.currentTime, 0.09, 400, 1.0, 0.18, pan);
  }

  /**
   * Subtle, randomized environmental glitch or metallic sound played whenever a flag
   * registers. It plays for every flag, right or wrong: flags are private, and accuracy
   * is only revealed in the travel report, so the sound must not confirm a real anomaly.
   */
  public flagRegistered() {
    if (!this.ac || !this.masterGain) return;
    const t = this.ac.currentTime;
    const variation = Math.floor(Math.random() * 3);
    const pan = Math.random() * 1.6 - 0.8;

    switch (variation) {
      case 0: {
        // Metallic Resonant Tine Ring (eerie, high harmonic chime)
        const f1 = 1480 + (Math.random() * 120 - 60);
        const f2 = f1 * 1.51; // slightly dissonant overtone
        this.tone(f1, t, 0.65, 0.045, 'sine');
        this.tone(f2, t, 0.45, 0.025, 'triangle');
        // Subtle metallic attack ping
        this.noiseHit(t, 0.04, 2800, 16, 0.06, pan);
        break;
      }
      case 1: {
        // Environmental Tape / Electrical Frequency Glitch
        this.noiseHit(t, 0.035, 3400, 8, 0.07, pan);
        this.noiseHit(t + 0.05, 0.025, 1800, 12, 0.05, -pan);

        const osc = this.ac.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(680, t + 0.02);
        osc.frequency.exponentialRampToValueAtTime(240, t + 0.28);

        const filter = this.ac.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(900, t + 0.02);
        filter.frequency.exponentialRampToValueAtTime(300, t + 0.28);

        const gain = this.ac.createGain();
        gain.gain.setValueAtTime(0.0001, t);
        gain.gain.linearRampToValueAtTime(0.04, t + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.28);

        let outNode: AudioNode = gain;
        if (this.ac.createStereoPanner) {
          const panner = this.ac.createStereoPanner();
          panner.pan.value = pan;
          outNode = gain.connect(panner);
        }

        osc.connect(filter).connect(gain);
        outNode.connect(this.masterGain);
        osc.start(t + 0.02);
        osc.stop(t + 0.3);
        break;
      }
      case 2:
      default: {
        // Metallic Resonant Subway Scrape / Shiver
        if (this.whiteBuffer) {
          const s = this.ac.createBufferSource();
          s.buffer = this.whiteBuffer;
          const f = this.ac.createBiquadFilter();
          f.type = 'bandpass';
          f.Q.value = 24;
          f.frequency.setValueAtTime(2600, t);
          f.frequency.exponentialRampToValueAtTime(1450, t + 0.45);

          const g = this.ac.createGain();
          g.gain.setValueAtTime(0.0001, t);
          g.gain.linearRampToValueAtTime(0.055, t + 0.04);
          g.gain.exponentialRampToValueAtTime(0.0001, t + 0.45);

          let outNode: AudioNode = g;
          if (this.ac.createStereoPanner) {
            const panner = this.ac.createStereoPanner();
            panner.pan.value = pan;
            outNode = g.connect(panner);
          }

          s.connect(f).connect(g);
          outNode.connect(this.masterGain);
          s.start(t, Math.random());
          s.stop(t + 0.5);
        }

        // Sub/metallic hollow undertone with eerie beat frequency
        this.tone(1185, t, 0.4, 0.03, 'sine');
        this.tone(1202, t, 0.4, 0.03, 'sine');
        break;
      }
    }
  }

  public screech(duration: number, volume: number = 0.08) {
    if (!this.ac || !this.whiteBuffer || !this.masterGain) return;
    const t = this.ac.currentTime;
    const src = this.ac.createBufferSource();
    src.buffer = this.whiteBuffer;
    src.loop = true;

    const filter = this.ac.createBiquadFilter();
    filter.type = 'bandpass';
    filter.Q.value = 22;
    filter.frequency.setValueAtTime(3300, t);
    filter.frequency.linearRampToValueAtTime(2100, t + duration);

    const gain = this.ac.createGain();
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.linearRampToValueAtTime(volume, t + 0.8);
    gain.gain.linearRampToValueAtTime(volume * 0.6, t + duration - 0.6);
    gain.gain.linearRampToValueAtTime(0.0001, t + duration);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    src.start(t);
    src.stop(t + duration + 0.1);
  }

  public whisper(duration: number) {
    if (!this.ac || !this.whiteBuffer || !this.masterGain) return;
    const t = this.ac.currentTime;
    const src = this.ac.createBufferSource();
    src.buffer = this.whiteBuffer;
    src.loop = true;

    const filter = this.ac.createBiquadFilter();
    filter.type = 'bandpass';
    filter.Q.value = 7;
    for (let k = 0; k < duration * 6; k++) {
      filter.frequency.setValueAtTime(900 + Math.random() * 1700, t + k / 6);
    }

    const gain = this.ac.createGain();
    gain.gain.setValueAtTime(0.0001, t);
    for (let k = 0; k < duration * 5; k++) {
      gain.gain.linearRampToValueAtTime(0.02 + Math.random() * 0.07, t + k / 5 + 0.06);
      gain.gain.linearRampToValueAtTime(0.004, t + k / 5 + 0.17);
    }
    gain.gain.linearRampToValueAtTime(0.0001, t + duration);

    let output: AudioNode = gain;
    if (this.ac.createStereoPanner) {
      const panner = this.ac.createStereoPanner();
      panner.pan.value = (Math.random() * 1.6) - 0.8;
      output = gain.connect(panner);
    }

    src.connect(filter);
    filter.connect(gain);
    output.connect(this.masterGain);
    src.start(t);
    src.stop(t + duration + 0.1);
  }

  private noiseHit(t: number, dur: number, freq: number, q: number, gainLevel: number, pan?: number) {
    if (!this.ac || !this.whiteBuffer || !this.masterGain) return;
    const src = this.ac.createBufferSource();
    src.buffer = this.whiteBuffer;

    const filter = this.ac.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = freq;
    filter.Q.value = q;

    const gain = this.ac.createGain();
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.linearRampToValueAtTime(gainLevel, t + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);

    let node: AudioNode = gain;
    if (pan !== undefined && this.ac.createStereoPanner) {
      const panner = this.ac.createStereoPanner();
      panner.pan.value = pan;
      node = gain.connect(panner);
    }

    src.connect(filter);
    filter.connect(gain);
    node.connect(this.masterGain);

    src.start(t, Math.random() * 1.5);
    src.stop(t + dur + 0.05);
  }

  private tone(freq: number, t: number, dur: number, gainLevel: number, type: OscillatorType = 'sine') {
    if (!this.ac || !this.masterGain) return;
    const osc = this.ac.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);

    const gain = this.ac.createGain();
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.linearRampToValueAtTime(gainLevel, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + dur + 0.05);
  }
}

export const audioEngine = new AudioEngine();
