/**
 * Playing a recorded tape back out loud
 */
import { Intercom } from './intercom';

const VOICE_BOOST = 3;
const TAIL_S = 0.6;

export class TapePlayback {
  private ac: BaseAudioContext;
  private out: GainNode;

  public readonly duration: number;

  constructor(ac: BaseAudioContext, destination: AudioNode, noise: AudioBuffer, voiceTier: number) {
    this.ac = ac;
    const t = ac.currentTime;
    this.out = ac.createGain();
    this.out.gain.setValueAtTime(0, t);
    this.out.gain.linearRampToValueAtTime(1, t + 0.08);
    this.out.connect(destination);

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

    setTimeout(() => {
      try {
        hiss.stop();
        motor.stop();
      } catch {
        /* ignore */
      }
    }, this.duration * 1000 + 100);
  }

  public stop() {
    try {
      this.out.gain.setValueAtTime(0, this.ac.currentTime);
    } catch {
      /* ignore */
    }
  }
}
