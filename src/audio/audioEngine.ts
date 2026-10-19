/**
 * Web Audio Engine for LAST LOCAL
 * Procedural synthesizers for subway ambience, rumble, track clacks, chimes,
 * curve screeches, whispers, and heartbeats. Zero external audio file dependencies.
 */

import { PauseMusic } from './pauseMusic';
import { RideMusic, type RideMusicCue } from './rideMusic';
import { Intercom } from './intercom';
import { LastLocalAnnouncementLoop } from './lastLocalAnnouncement';
import { TapePlayback } from './tapePlayback';
import { EvpAudio, type EvpSoundState } from './evpAudio';
import { settings } from '../settings';

/*
 * Signal chain:
 *   game sounds + bed ─► masterGain (game bus: run level, ducked while paused) ─► gameVol ─┐
 *   pause music (the clean tune) ──────────────────────────────────────────────► musicVol ─┤
 *   ride music (the tune going wrong, rideMusic.ts) ─► its own pause duck ─────► musicVol ─┴► outGain (mute) ─► speakers
 *
 * gameVol and musicVol are the player's volume settings; they never move otherwise.
 */
export class AudioEngine {
  private ac: AudioContext | null = null;
  private outGain: GainNode | null = null;
  private masterGain: GainNode | null = null;
  private gameVol: GainNode | null = null;
  private musicVol: GainNode | null = null;
  private pauseMusic: PauseMusic | null = null;
  private rideMusic: RideMusic | null = null;
  private intercomVoice: Intercom | null = null;
  private lastLocalAnnouncement: LastLocalAnnouncementLoop | null = null;
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

      // Player volume settings
      const v = settings.get();
      this.gameVol = this.ac.createGain();
      this.gameVol.gain.setValueAtTime(v.gameVolume, this.ac.currentTime);
      this.gameVol.connect(this.outGain);
      this.musicVol = this.ac.createGain();
      this.musicVol.gain.setValueAtTime(v.musicVolume, this.ac.currentTime);
      this.musicVol.connect(this.outGain);
      settings.subscribe(() => this.applyVolumeSettings());

      // Game bus
      this.masterGain = this.ac.createGain();
      this.masterGain.gain.setValueAtTime(this.masterVolume, this.ac.currentTime);
      this.masterGain.connect(this.gameVol);

      this.pauseMusic = new PauseMusic(this.ac, this.musicVol);
      this.rideMusic = new RideMusic(this.ac, this.musicVol);

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

      // Background intercom on the game bus: ducked on pause, covered by mute.
      this.intercomVoice = new Intercom(this.ac, this.masterGain, this.whiteBuffer);

      // Ambient loop: 'last-local-announcement' for late-night NYC subway conductor voice
      this.lastLocalAnnouncement = new LastLocalAnnouncementLoop(this.ac, this.masterGain, this.whiteBuffer);

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

  private applyVolumeSettings() {
    if (!this.ac || !this.gameVol || !this.musicVol) return;
    const v = settings.get();
    // Short ramp so dragging a slider doesn't click.
    this.gameVol.gain.setTargetAtTime(v.gameVolume, this.ac.currentTime, 0.03);
    this.musicVol.gain.setTargetAtTime(v.musicVolume, this.ac.currentTime, 0.03);
  }

  private evpAudio: EvpAudio | null = null;

  /** The EVP recorder's sound (hiss, tuning whistle, voices). Built on first use. */
  public evpUpdate(state: EvpSoundState) {
    if (!this.ac || !this.masterGain || !this.whiteBuffer) return;
    if (!this.evpAudio) {
      if (!state.raised) return;
      this.evpAudio = new EvpAudio(this.ac, this.masterGain, this.whiteBuffer);
    }
    this.evpAudio.update(state);
  }

  private tape: TapePlayback | null = null;

  /** Play a tape out loud (see tapePlayback.ts). Returns its duration in seconds, 0 if audio is off. */
  public playTape(voiceTier: number): number {
    this.stopTape();
    if (!this.ac || !this.gameVol || !this.whiteBuffer) return 0;
    this.tape = new TapePlayback(this.ac, this.gameVol, this.whiteBuffer, voiceTier);
    return this.tape.duration;
  }

  public stopTape() {
    this.tape?.stop();
    this.tape = null;
  }

  /** For tests: the playback's output level (0 when nothing is playing). */
  public getTapeLevel(): number {
    return this.tape?.level ?? 0;
  }

  public getEvpAudio(): EvpAudio | null {
    return this.evpAudio;
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
   * Pause: fade the game and the ride's music out, and the clean pause tune in. The ride's music
   * keeps its place (it runs on game time) and picks up where it was on resume.
   * The audio context keeps running; use suspend() instead when the tab is hidden.
   */
  public enterPause() {
    if (!this.ac || !this.masterGain) return;
    this.ducked = true;
    this.masterGain.gain.setTargetAtTime(0, this.ac.currentTime, 0.12);
    this.rideMusic?.setPaused(true);
    this.pauseMusic?.start();
  }

  /** Resume: fade the pause tune out and the game (and the ride's music) back in. */
  public exitPause() {
    if (!this.ac || !this.masterGain) return;
    this.ducked = false;
    this.masterGain.gain.setTargetAtTime(this.masterVolume, this.ac.currentTime, 0.3);
    this.rideMusic?.setPaused(false);
    this.pauseMusic?.stop();
  }

  /** The ride's music, every frame the game runs (see rideMusic.ts). */
  public updateRideMusic(dt: number, cue: RideMusicCue) {
    this.rideMusic?.update(dt, cue);
  }

  /** A new ride: the ride's music goes back to the top of the tune. */
  public resetRideMusic() {
    this.rideMusic?.reset();
  }

  /** For tests. */
  public getRideMusic(): RideMusic | null {
    return this.rideMusic;
  }

  /** For tests and the debug overlay. */
  public getPauseMusic(): PauseMusic | null {
    return this.pauseMusic;
  }

  /** One garbled background announcement, shaped by sanity tier. Returns its duration (s), 0 if audio is off. */
  public intercom(tier: number): number {
    return this.intercomVoice ? this.intercomVoice.play(tier) : 0;
  }

  public getIntercom(): Intercom | null {
    return this.intercomVoice;
  }

  /**
   * Ambient audio loop 'last-local-announcement':
   * Plays the distorted late-night NYC subway conductor announcement during the intro.
   */
  public startLastLocalAnnouncement(t0?: number) {
    this.lastLocalAnnouncement?.start(t0);
  }

  public stopLastLocalAnnouncement(fadeDuration: number = 0.8) {
    this.lastLocalAnnouncement?.stop(fadeDuration);
  }

  public getLastLocalAnnouncement(): LastLocalAnnouncementLoop | null {
    return this.lastLocalAnnouncement;
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
    const variation = Math.floor(Math.random() * 5);
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
      case 2: {
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
      case 3: {
        // Fluorescent Ballast Surge & Resonant Metal Ping
        this.noiseHit(t, 0.025, 3200, 20, 0.05, pan);
        this.tone(120, t, 0.22, 0.04, 'sawtooth');
        this.tone(2140, t, 0.5, 0.03, 'sine');
        break;
      }
      case 4:
      default: {
        // Mechanical Relay Snap & Damped Steel Ring
        this.noiseHit(t, 0.015, 1600, 5, 0.08, pan);
        this.tone(880 + Math.random() * 80, t + 0.01, 0.35, 0.035, 'triangle');
        this.tone(1760 + Math.random() * 160, t + 0.01, 0.2, 0.02, 'sine');
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

  /**
   * Procedural whispering synthesizer. Supports low-pass filtering,
   * tier-specific formant shaping, and distant spatial placement.
   */
  public whisper(
    duration: number,
    options?: { lowpass?: boolean; cutoff?: number; tier?: number; distant?: boolean }
  ) {
    if (!this.ac || !this.whiteBuffer || !this.masterGain) return;
    const t = this.ac.currentTime;
    const src = this.ac.createBufferSource();
    src.buffer = this.whiteBuffer;
    src.loop = true;

    const tier = options?.tier ?? 2;
    const distant = options?.distant ?? (tier <= 2);
    const useLowpass = options?.lowpass ?? distant;

    // Resonant bandpass formant simulating vocal sibilance
    const filter = this.ac.createBiquadFilter();
    filter.type = 'bandpass';
    filter.Q.value = distant ? 9 : 6;
    for (let k = 0; k < duration * 6; k++) {
      const baseFreq = distant ? 750 + Math.random() * 850 : 900 + Math.random() * 1700;
      filter.frequency.setValueAtTime(baseFreq, t + k / 6);
    }

    const gain = this.ac.createGain();
    gain.gain.setValueAtTime(0.0001, t);
    const gainMax = distant ? 0.035 + tier * 0.015 : 0.06;
    for (let k = 0; k < duration * 5; k++) {
      gain.gain.linearRampToValueAtTime(0.01 + Math.random() * gainMax, t + k / 5 + 0.06);
      gain.gain.linearRampToValueAtTime(0.002, t + k / 5 + 0.17);
    }
    gain.gain.linearRampToValueAtTime(0.0001, t + duration);

    let chainNode: AudioNode = filter;

    // Low-pass filter for distant / muffled acoustic illusion
    if (useLowpass) {
      const lp = this.ac.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.setValueAtTime(options?.cutoff ?? (tier >= 3 ? 1100 : 700), t);
      lp.Q.value = 2.5;
      chainNode.connect(lp);
      chainNode = lp;
    }

    chainNode.connect(gain);

    let output: AudioNode = gain;
    if (this.ac.createStereoPanner) {
      const panner = this.ac.createStereoPanner();
      const panStart = (Math.random() * 1.6) - 0.8;
      panner.pan.setValueAtTime(panStart, t);
      panner.pan.linearRampToValueAtTime(-panStart * 0.7, t + duration);
      output = gain.connect(panner);
    }

    output.connect(this.masterGain);
    src.connect(filter);
    src.start(t);
    src.stop(t + duration + 0.1);
  }

  /**
   * Distant low-pass filtered whispering triggered when entering a higher sanity tier.
   * Produces a subtle, uneasy murmur in the background that shifts across the stereo spectrum.
   */
  public tierTransitionWhisper(newTier: number) {
    if (!this.ac || !this.masterGain || newTier <= 0) return;
    const t = this.ac.currentTime;

    // Distant whisper burst
    const dur = 2.6 + newTier * 0.6;
    this.whisper(dur, { lowpass: true, cutoff: 550 + newTier * 150, tier: newTier, distant: true });

    // Faint sub-rumble swell accompanying the perceptual drop
    const sub = this.ac.createOscillator();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(54 - newTier * 4, t);
    sub.frequency.exponentialRampToValueAtTime(42, t + dur);

    const subGain = this.ac.createGain();
    subGain.gain.setValueAtTime(0.0001, t);
    subGain.gain.linearRampToValueAtTime(0.035 * Math.min(1, newTier * 0.4), t + 0.8);
    subGain.gain.exponentialRampToValueAtTime(0.0001, t + dur);

    sub.connect(subGain);
    subGain.connect(this.masterGain);
    sub.start(t);
    sub.stop(t + dur + 0.05);
  }

  /**
   * Polaroid 600 camera shutter sound:
   * Instant shutter blade snap, high-pitch capacitor discharge whine, and motor ejection roller sound.
   */
  public polaroidShutter() {
    if (!this.ac || !this.masterGain) return;
    const t = this.ac.currentTime;

    // 1. Blade snap click (sharp high transient)
    this.noiseHit(t, 0.045, 3800, 4, 0.35);
    this.noiseHit(t + 0.015, 0.035, 1400, 2, 0.25);

    // 2. High voltage Xenon flash discharge buzz/whine
    const flashOsc = this.ac.createOscillator();
    flashOsc.type = 'sawtooth';
    flashOsc.frequency.setValueAtTime(4200, t);
    flashOsc.frequency.exponentialRampToValueAtTime(180, t + 0.2);

    const flashGain = this.ac.createGain();
    flashGain.gain.setValueAtTime(0.001, t);
    flashGain.gain.linearRampToValueAtTime(0.08, t + 0.01);
    flashGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);

    flashOsc.connect(flashGain).connect(this.masterGain);
    flashOsc.start(t);
    flashOsc.stop(t + 0.25);

    // 3. Film ejection motorized roller whir (mechanical gear motor ramp)
    const motorT = t + 0.25;
    const motorOsc = this.ac.createOscillator();
    motorOsc.type = 'triangle';
    motorOsc.frequency.setValueAtTime(320, motorT);
    motorOsc.frequency.linearRampToValueAtTime(540, motorT + 0.15);
    motorOsc.frequency.linearRampToValueAtTime(480, motorT + 0.55);

    const motorGain = this.ac.createGain();
    motorGain.gain.setValueAtTime(0.0001, motorT);
    motorGain.gain.linearRampToValueAtTime(0.065, motorT + 0.05);
    motorGain.gain.setValueAtTime(0.065, motorT + 0.45);
    motorGain.gain.exponentialRampToValueAtTime(0.0001, motorT + 0.65);

    motorOsc.connect(motorGain).connect(this.masterGain);
    motorOsc.start(motorT);
    motorOsc.stop(motorT + 0.7);

    // Gear texture noise during ejection
    if (this.whiteBuffer) {
      const gearSrc = this.ac.createBufferSource();
      gearSrc.buffer = this.whiteBuffer;
      const gearFilt = this.ac.createBiquadFilter();
      gearFilt.type = 'bandpass';
      gearFilt.frequency.setValueAtTime(800, motorT);
      gearFilt.Q.value = 8;
      const gearG = this.ac.createGain();
      gearG.gain.setValueAtTime(0.001, motorT);
      gearG.gain.linearRampToValueAtTime(0.04, motorT + 0.06);
      gearG.gain.exponentialRampToValueAtTime(0.0001, motorT + 0.6);

      gearSrc.connect(gearFilt).connect(gearG).connect(this.masterGain);
      gearSrc.start(motorT);
      gearSrc.stop(motorT + 0.65);
    }
  }

  /**
   * Heavy spring-loaded gangway door opening/closing sound:
   * Heavy metal handle clunk, squealing steel hinges, and rushing tunnel wind.
   */
  public doorGangway() {
    if (!this.ac || !this.masterGain) return;
    const t = this.ac.currentTime;

    // Heavy latch clack
    this.noiseHit(t, 0.08, 650, 2, 0.3);
    this.noiseHit(t + 0.02, 0.12, 180, 1.5, 0.45);

    // Squealing metallic hinge friction
    const hinge = this.ac.createOscillator();
    hinge.type = 'sawtooth';
    hinge.frequency.setValueAtTime(1450, t + 0.05);
    hinge.frequency.exponentialRampToValueAtTime(820, t + 0.35);

    const hingeGain = this.ac.createGain();
    hingeGain.gain.setValueAtTime(0.0001, t + 0.05);
    hingeGain.gain.linearRampToValueAtTime(0.05, t + 0.1);
    hingeGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.4);

    hinge.connect(hingeGain).connect(this.masterGain);
    hinge.start(t + 0.05);
    hinge.stop(t + 0.45);

    // Rush of outside wind
    if (this.brownBuffer) {
      const windSrc = this.ac.createBufferSource();
      windSrc.buffer = this.brownBuffer;
      const windFilt = this.ac.createBiquadFilter();
      windFilt.type = 'lowpass';
      windFilt.frequency.setValueAtTime(600, t + 0.1);
      windFilt.frequency.linearRampToValueAtTime(1200, t + 0.3);
      windFilt.frequency.exponentialRampToValueAtTime(300, t + 0.9);

      const windGain = this.ac.createGain();
      windGain.gain.setValueAtTime(0.0001, t + 0.1);
      windGain.gain.linearRampToValueAtTime(0.12, t + 0.35);
      windGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.95);

      windSrc.connect(windFilt).connect(windGain).connect(this.masterGain);
      windSrc.start(t + 0.1);
      windSrc.stop(t + 1.0);
    }
  }

  private openAirGain: GainNode | null = null;
  private openAirLevel = 0;

  /**
   * Open air on the trestle: low wind plus rain hiss on the glass, faded by how much of the
   * train is outside (0 in the tunnel, 1 fully out). Built on first use, on the game bus.
   */
  public setOpenAir(level: number) {
    if (!this.ac || !this.masterGain || !this.whiteBuffer) return;
    level = Math.max(0, Math.min(1, level));
    if (Math.abs(level - this.openAirLevel) < 0.01 && (level === 0) === (this.openAirLevel === 0)) return;
    this.openAirLevel = level;
    if (!this.openAirGain) {
      if (level === 0) return;
      const ac = this.ac;
      this.openAirGain = ac.createGain();
      this.openAirGain.gain.value = 0;
      this.openAirGain.connect(this.masterGain);
      const src = ac.createBufferSource();
      src.buffer = this.whiteBuffer;
      src.loop = true;
      // Wind: low, slowly breathing.
      const windLp = ac.createBiquadFilter();
      windLp.type = 'lowpass';
      windLp.frequency.value = 420;
      const windGain = ac.createGain();
      windGain.gain.value = 0.55;
      const lfo = ac.createOscillator();
      lfo.frequency.value = 0.13;
      const lfoAmt = ac.createGain();
      lfoAmt.gain.value = 0.25;
      lfo.connect(lfoAmt).connect(windGain.gain);
      lfo.start();
      // Rain on glass: a soft high hiss.
      const rainHp = ac.createBiquadFilter();
      rainHp.type = 'highpass';
      rainHp.frequency.value = 3800;
      const rainGain = ac.createGain();
      rainGain.gain.value = 0.22;
      src.connect(windLp).connect(windGain).connect(this.openAirGain);
      src.connect(rainHp).connect(rainGain).connect(this.openAirGain);
      src.start();
    }
    this.openAirGain.gain.setTargetAtTime(level * 0.14, this.ac.currentTime, 0.4);
  }

  public getOpenAirLevel(): number {
    return this.openAirLevel;
  }

  /**
   * Tunnel wind intensity swell when standing in or near the gangway coupling.
   */
  public gangwayWind(intensity: number) {
    if (!this.ac || !this.rumbleGain) return;
    const now = this.ac.currentTime;
    const targetLp = 300 + 400 * Math.max(0, Math.min(1, intensity));
    this.lpFilter?.frequency.setTargetAtTime(targetLp, now, 0.1);
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
