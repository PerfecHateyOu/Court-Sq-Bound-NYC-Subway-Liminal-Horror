/**
 * Web Audio Engine for Court Sq-Bound
 * Procedural synthesizers for subway ambience, rumble, track clacks, chimes,
 * curve screeches, whispers, and heartbeats. Zero external audio file dependencies.
 */

export class AudioEngine {
  private ac: AudioContext | null = null;
  private masterGain: GainNode | null = null;
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

      // Master output bus
      this.masterGain = this.ac.createGain();
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : this.masterVolume, this.ac.currentTime);
      this.masterGain.connect(this.ac.destination);

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
    this.isMuted = !this.isMuted;
    this.setMasterLevel(this.masterVolume, 0.05);
    return this.isMuted;
  }

  public setMute(muted: boolean) {
    this.isMuted = muted;
    this.setMasterLevel(this.masterVolume, 0.05);
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  public setMasterLevel(level: number, rampTime: number = 0.3) {
    this.masterVolume = level;
    if (this.ac && this.masterGain) {
      this.masterGain.gain.setTargetAtTime(this.isMuted ? 0 : level, this.ac.currentTime, rampTime);
    }
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

  public thump() {
    if (!this.ac) return;
    const t = this.ac.currentTime;
    this.tone(52, t, 0.22, 0.22);
    this.tone(48, t + 0.24, 0.25, 0.16);
  }

  public step() {
    if (!this.ac) return;
    const pan = (Math.random() * 2 - 1);
    this.noiseHit(this.ac.currentTime, 0.09, 400, 1.0, 0.18, pan);
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
