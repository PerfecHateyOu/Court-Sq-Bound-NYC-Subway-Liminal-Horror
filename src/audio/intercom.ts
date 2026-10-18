/**
 * Subway PA Intercom Synthesizer
 * Synthesizes vintage MTA two-tone chime and bandpass-filtered announcements.
 */
export class Intercom {
  private ac: BaseAudioContext;
  private dest: AudioNode;
  private noise: AudioBuffer;

  constructor(ac: BaseAudioContext, dest: AudioNode, noise: AudioBuffer) {
    this.ac = ac;
    this.dest = dest;
    this.noise = noise;
  }

  public play(tier: number, startTime: number): number {
    const t = startTime;
    const dur = 2.4 + Math.random() * 1.2;

    // Filtered noise voice burst
    const src = this.ac.createBufferSource();
    src.buffer = this.noise;
    src.loop = true;

    const bp = this.ac.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(900 + tier * 200, t);
    bp.Q.value = 1.8;

    const gain = this.ac.createGain();
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.4, t + 0.15);
    gain.gain.setValueAtTime(0.4, t + dur - 0.2);
    gain.gain.linearRampToValueAtTime(0, t + dur);

    src.connect(bp).connect(gain).connect(this.dest);
    src.start(t);
    src.stop(t + dur);

    return dur;
  }
}
