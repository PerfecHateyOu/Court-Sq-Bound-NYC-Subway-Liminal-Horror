/**
 * Subway Audio Engine
 * Dynamic procedural audio synthesis for wheel rumble, rail clicks, air brakes,
 * station chimes, gangway drafts, EVP static, and psychological horror whispers.
 */
import { settings } from '../settings';
import { Intercom } from './intercom';
import { EvpAudio, EvpSoundState } from './evpAudio';
import { TapePlayback } from './tapePlayback';
import { PauseMusic } from './pauseMusic';

export class AudioEngine {
  public ac!: AudioContext;
  private masterGain!: GainNode;
  private bedGain!: GainNode;
  private noiseBuffer!: AudioBuffer;
  private openAirGain!: GainNode;
  private windGain!: GainNode;
  private evpAudioInstance: EvpAudio | null = null;
  private activeTape: TapePlayback | null = null;
  private pauseMusicInstance: PauseMusic | null = null;
  private muted = false;

  constructor() {
    this.init();
  }

  public init(_canvas?: any) {
    if (this.ac) return;
    if (typeof window === 'undefined') return;
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;

    this.ac = new AudioCtx();
    this.masterGain = this.ac.createGain();
    this.masterGain.gain.value = settings.get().gameVolume;
    this.masterGain.connect(this.ac.destination);

    this.bedGain = this.ac.createGain();
    this.bedGain.gain.value = 1.0;
    this.bedGain.connect(this.masterGain);

    this.openAirGain = this.ac.createGain();
    this.openAirGain.gain.value = 0;
    this.openAirGain.connect(this.masterGain);

    this.windGain = this.ac.createGain();
    this.windGain.gain.value = 0;
    this.windGain.connect(this.masterGain);

    // Generate 5-second pink/white noise buffer for rumblings and filters
    const sr = this.ac.sampleRate;
    this.noiseBuffer = this.ac.createBuffer(1, sr * 5, sr);
    const data = this.noiseBuffer.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0;
    for (let i = 0; i < data.length; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      data[i] = (b0 + b1 + b2 + white * 0.5362) * 0.1;
    }

    this.evpAudioInstance = new EvpAudio(this.ac, this.masterGain, this.noiseBuffer);
    this.pauseMusicInstance = new PauseMusic(this.ac, this.masterGain);

    settings.subscribe(() => {
      if (this.ac && this.masterGain) {
        const v = this.muted ? 0 : settings.get().gameVolume;
        this.masterGain.gain.setTargetAtTime(v, this.ac.currentTime, 0.05);
      }
    });
  }

  public resume() {
    if (this.ac && this.ac.state === 'suspended') {
      this.ac.resume();
    }
  }

  public setMuted(m: boolean) {
    this.muted = m;
    if (this.ac && this.masterGain) {
      const v = m ? 0 : settings.get().gameVolume;
      this.masterGain.gain.setTargetAtTime(v, this.ac.currentTime, 0.05);
    }
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public getMuted(): boolean {
    return this.muted;
  }

  public toggleMute(): boolean {
    this.setMuted(!this.muted);
    return this.muted;
  }

  public suspend() {
    if (this.ac && this.ac.state === 'running') {
      try {
        this.ac.suspend();
      } catch {
        /* ignore */
      }
    }
  }

  public wake() {
    this.resume();
  }

  public enterPause() {
    this.startPauseMusic();
  }

  public exitPause() {
    this.stopPauseMusic();
  }

  public setMasterLevel(level: number, ramp: number = 0.1) {
    if (!this.ac || this.muted) return;
    this.masterGain.gain.setTargetAtTime(level * settings.get().gameVolume, this.ac.currentTime, ramp);
  }

  public setBedLevel(level: number, ramp: number = 0.1) {
    if (!this.ac) return;
    this.bedGain.gain.setTargetAtTime(level, this.ac.currentTime, ramp);
  }

  public setOpenAir(k: number) {
    if (!this.ac) return;
    this.openAirGain.gain.setTargetAtTime(k, this.ac.currentTime, 0.1);
  }

  public gangwayWind(amount: number) {
    if (!this.ac) return;
    this.windGain.gain.setTargetAtTime(amount * 0.35, this.ac.currentTime, 0.1);
  }

  public chime() {
    if (!this.ac) return;
    const t = this.ac.currentTime;
    const playNote = (freq: number, start: number) => {
      const osc = this.ac.createOscillator();
      const gain = this.ac.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, start);
      gain.gain.setValueAtTime(0.2, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.9);
      osc.connect(gain).connect(this.masterGain);
      osc.start(start);
      osc.stop(start + 0.95);
    };
    playNote(659.25, t); // E5
    playNote(523.25, t + 0.35); // C5
  }

  public playTape(voiceTier: number): number {
    if (!this.ac) return 4;
    this.stopTape();
    this.activeTape = new TapePlayback(this.ac, this.masterGain, this.noiseBuffer, voiceTier);
    return this.activeTape.duration;
  }

  public stopTape() {
    if (this.activeTape) {
      this.activeTape.stop();
      this.activeTape = null;
    }
  }

  public blip() {
    if (!this.ac) return;
    const t = this.ac.currentTime;
    const osc = this.ac.createOscillator();
    const g = this.ac.createGain();
    osc.frequency.setValueAtTime(1400, t);
    g.gain.setValueAtTime(0.08, t);
    g.gain.linearRampToValueAtTime(0, t + 0.04);
    osc.connect(g).connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.05);
  }

  public step() {
    if (!this.ac) return;
    const t = this.ac.currentTime;
    const osc = this.ac.createOscillator();
    const g = this.ac.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(80 + Math.random() * 20, t);
    g.gain.setValueAtTime(0.04, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
    osc.connect(g).connect(this.bedGain);
    osc.start(t);
    osc.stop(t + 0.09);
  }

  public whisper(dur: number = 2.0) {
    if (!this.ac) return;
    const t = this.ac.currentTime;
    const src = this.ac.createBufferSource();
    src.buffer = this.noiseBuffer;
    const bp = this.ac.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(1600, t);
    bp.Q.value = 5.0;
    const g = this.ac.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.12, t + 0.4);
    g.gain.linearRampToValueAtTime(0, t + dur);
    src.connect(bp).connect(g).connect(this.masterGain);
    src.start(t);
    src.stop(t + dur);
  }

  public tierTransitionWhisper(tier: number) {
    this.whisper(1.8 + tier * 0.6);
  }

  public thump(period: number) {
    if (!this.ac) return;
    const t = this.ac.currentTime;
    const osc = this.ac.createOscillator();
    const g = this.ac.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(45, t);
    g.gain.setValueAtTime(0.25, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
    osc.connect(g).connect(this.bedGain);
    osc.start(t);
    osc.stop(t + 0.16);
  }

  public intercom(tier: number): number {
    if (!this.ac) return 3;
    const intercom = new Intercom(this.ac, this.masterGain, this.noiseBuffer);
    return intercom.play(tier, this.ac.currentTime);
  }

  public screech(dur: number, vol: number) {
    if (!this.ac) return;
    const t = this.ac.currentTime;
    const osc = this.ac.createOscillator();
    const g = this.ac.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(2800, t);
    g.gain.setValueAtTime(vol * 0.5, t);
    g.gain.linearRampToValueAtTime(0, t + dur);
    osc.connect(g).connect(this.bedGain);
    osc.start(t);
    osc.stop(t + dur);
  }

  public evpUpdate(state: EvpSoundState) {
    this.evpAudioInstance?.update(state);
  }

  public updateTrainSpeed(sf: number) {
    // Train speed modulates engine hum
  }

  public startPauseMusic() {
    this.pauseMusicInstance?.start();
  }

  public clack(vol: number = 0.3) {
    if (!this.ac) return;
    const t = this.ac.currentTime;
    const osc = this.ac.createOscillator();
    const g = this.ac.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(320, t);
    osc.frequency.exponentialRampToValueAtTime(80, t + 0.06);
    g.gain.setValueAtTime(vol * 0.4, t);
    g.gain.linearRampToValueAtTime(0, t + 0.07);
    osc.connect(g).connect(this.bedGain);
    osc.start(t);
    osc.stop(t + 0.08);
  }

  public flagRegistered() {
    if (!this.ac) return;
    const t = this.ac.currentTime;
    const osc = this.ac.createOscillator();
    const g = this.ac.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, t);
    osc.frequency.setValueAtTime(1320, t + 0.06);
    g.gain.setValueAtTime(0.12, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
    osc.connect(g).connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.2);
  }

  public doorGangway() {
    if (!this.ac) return;
    const t = this.ac.currentTime;
    const osc = this.ac.createOscillator();
    const g = this.ac.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(140, t);
    osc.frequency.linearRampToValueAtTime(80, t + 0.3);
    g.gain.setValueAtTime(0.15, t);
    g.gain.linearRampToValueAtTime(0, t + 0.35);
    osc.connect(g).connect(this.bedGain);
    osc.start(t);
    osc.stop(t + 0.36);
  }

  public polaroidShutter() {
    if (!this.ac) return;
    const t = this.ac.currentTime;
    // Metallic shutter click
    const osc = this.ac.createOscillator();
    const g = this.ac.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(1200, t);
    osc.frequency.exponentialRampToValueAtTime(200, t + 0.04);
    g.gain.setValueAtTime(0.3, t);
    g.gain.linearRampToValueAtTime(0, t + 0.05);
    osc.connect(g).connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.06);

    // Motor whir
    const motor = this.ac.createOscillator();
    const mg = this.ac.createGain();
    motor.type = 'sawtooth';
    motor.frequency.setValueAtTime(320, t + 0.08);
    motor.frequency.linearRampToValueAtTime(280, t + 0.55);
    mg.gain.setValueAtTime(0.08, t + 0.08);
    mg.gain.linearRampToValueAtTime(0, t + 0.6);
    motor.connect(mg).connect(this.masterGain);
    motor.start(t + 0.08);
    motor.stop(t + 0.62);
  }
}

export const audioEngine = new AudioEngine();
