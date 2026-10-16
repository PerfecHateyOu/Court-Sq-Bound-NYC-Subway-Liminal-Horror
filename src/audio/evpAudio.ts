/**
 * Sound of the EVP recorder: tape hiss while it's up, a heterodyne whistle that rises as you
 * tune toward any carrier (broadcast or decoy alike), motor hum while recording, and once
 * locked either garbled speech (a broadcast, using the intercom voice) or a flat carrier tone
 * (a decoy). Everything goes to the game bus, so it follows Game sounds, pause and mute.
 */
import { Intercom } from './intercom';

export interface EvpSoundState {
  raised: boolean;
  recording: boolean;
  /** 0..1 closeness to the nearest carrier. */
  meter: number;
  lock: 'signal' | 'decoy' | null;
  /** Intercom voice tier for the locked broadcast. */
  voice: number;
}

export class EvpAudio {
  private ac: AudioContext;
  private bus: GainNode;
  private hissGain: GainNode;
  private whistle: OscillatorNode;
  private whistleGain: GainNode;
  private carrierGain: GainNode;
  private motorGain: GainNode;
  private voice: Intercom;
  private nextVoiceAt = 0;

  constructor(ac: AudioContext, destination: AudioNode, noise: AudioBuffer) {
    this.ac = ac;
    this.bus = ac.createGain();
    this.bus.gain.value = 0;
    this.bus.connect(destination);

    const src = ac.createBufferSource();
    src.buffer = noise;
    src.loop = true;
    const bp = ac.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 2600;
    bp.Q.value = 0.6;
    this.hissGain = ac.createGain();
    this.hissGain.gain.value = 0.05;
    src.connect(bp).connect(this.hissGain).connect(this.bus);
    src.start();

    this.whistle = ac.createOscillator();
    this.whistle.type = 'sine';
    this.whistle.frequency.value = 1800;
    this.whistleGain = ac.createGain();
    this.whistleGain.gain.value = 0;
    this.whistle.connect(this.whistleGain).connect(this.bus);
    this.whistle.start();

    const carrier = ac.createOscillator();
    carrier.type = 'sine';
    carrier.frequency.value = 1000;
    this.carrierGain = ac.createGain();
    this.carrierGain.gain.value = 0;
    carrier.connect(this.carrierGain).connect(this.bus);
    carrier.start();

    const motor = ac.createOscillator();
    motor.type = 'triangle';
    motor.frequency.value = 58;
    const flutter = ac.createOscillator();
    flutter.frequency.value = 6.5;
    const flutterAmt = ac.createGain();
    flutterAmt.gain.value = 1.2;
    flutter.connect(flutterAmt).connect(motor.frequency);
    flutter.start();
    this.motorGain = ac.createGain();
    this.motorGain.gain.value = 0;
    motor.connect(this.motorGain).connect(this.bus);
    motor.start();

    const voiceOut = ac.createGain();
    voiceOut.gain.value = 0.9;
    voiceOut.connect(this.bus);
    this.voice = new Intercom(ac, voiceOut, noise);
  }

  public update(s: EvpSoundState) {
    const t = this.ac.currentTime;
    const tc = 0.06;
    this.bus.gain.setTargetAtTime(s.raised ? 1 : 0, t, 0.08);
    if (!s.raised) return;
    // Whistle: audible while approaching a carrier, fades out once locked.
    const approach = s.lock ? 0 : s.meter;
    this.whistleGain.gain.setTargetAtTime(0.035 * approach, t, tc);
    this.whistle.frequency.setTargetAtTime(400 + (1 - s.meter) * 2400, t, tc);
    this.hissGain.gain.setTargetAtTime(s.lock ? 0.025 : 0.05, t, tc);
    this.carrierGain.gain.setTargetAtTime(s.lock === 'decoy' ? 0.03 : 0, t, tc);
    this.motorGain.gain.setTargetAtTime(s.recording ? 0.012 : 0, t, 0.1);
    if (s.lock === 'signal' && t >= this.nextVoiceAt) {
      const dur = this.voice.play(Math.max(0, Math.min(3, s.voice)), t + 0.05);
      this.nextVoiceAt = t + dur + 0.6;
    }
    if (s.lock !== 'signal') this.nextVoiceAt = Math.min(this.nextVoiceAt, t + 0.2);
  }

  public get level(): number {
    return this.bus.gain.value;
  }
}
