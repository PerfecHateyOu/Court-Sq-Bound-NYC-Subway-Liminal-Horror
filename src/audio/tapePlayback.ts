/**
 * Playing a recorded tape back out loud: cassette hiss, a little motor hum, and the
 * broadcast's garbled voice (the intercom synth), from the recorder's tiny speaker.
 *
 * It plays on the Game volume channel, after the game bus: pausing or the report screen
 * doesn't silence it, but Game volume and mute still apply.
 */
import { Intercom } from './intercom';

/** The intercom voice is mixed for the background; a recorder held up close is louder. */
const VOICE_BOOST = 3;
const TAIL_S = 0.6;

export class TapePlayback {
  private ac: BaseAudioContext;
  private out: GainNode;
  private sources: AudioScheduledSourceNode[] = [];

  /** Builds and starts one playback. `duration` is how long it runs, in seconds. */
  public readonly duration: number;

  constructor(ac: BaseAudioContext, destination: AudioNode, noise: AudioBuffer, voiceTier: number) {
    this.ac = ac;
    const t = ac.currentTime;
    this.out = ac.createGain();
    this.out.gain.setValueAtTime(0, t);
    this.out.gain.linearRampToValueAtTime(1, t + 0.08);
    this.out.connect(destination);

    // Speaker: band-limited, like a palm-sized recorder.
    const speaker = ac.createBiquadFilter();
    speaker.type = 'bandpass';
    speaker.frequency.value = 1500;
    speaker.Q.value = 0.7;
    speaker.connect(this.out);

    const hiss = ac.createBufferSource();
    hiss.buffer = noise;
    hiss.loop = true;
    const hissGain = ac.createGain();
    hissGain.gain.value = 0.035;
    hiss.connect(hissGain).connect(speaker);
    hiss.start(t);

    const motor = ac.createOscillator();
    motor.type = 'triangle';
    motor.frequency.value = 58;
    const motorGain = ac.createGain();
    motorGain.gain.value = 0.01;
    motor.connect(motorGain).connect(this.out);
    motor.start(t);

    const voiceOut = ac.createGain();
    voiceOut.gain.value = VOICE_BOOST;
    voiceOut.connect(speaker);
    const voiceDur = new Intercom(ac, voiceOut, noise).play(voiceTier, t + 0.35);

    this.duration = 0.35 + voiceDur + TAIL_S;
    const end = t + this.duration;
    this.out.gain.setValueAtTime(1, end - 0.15);
    this.out.gain.linearRampToValueAtTime(0, end);
    hiss.stop(end + 0.05);
    motor.stop(end + 0.05);
    this.sources = [hiss, motor];
  }

  /** Stop early (a short fade, so it doesn't click). */
  public stop() {
    const t = this.ac.currentTime;
    this.out.gain.cancelScheduledValues(t);
    this.out.gain.setValueAtTime(this.out.gain.value, t);
    this.out.gain.linearRampToValueAtTime(0, t + 0.06);
    for (const s of this.sources) {
      try {
        s.stop(t + 0.08);
      } catch {
        /* already stopped */
      }
    }
    setTimeout(() => this.out.disconnect(), 200);
  }

  public get level(): number {
    return this.out.gain.value;
  }
}
