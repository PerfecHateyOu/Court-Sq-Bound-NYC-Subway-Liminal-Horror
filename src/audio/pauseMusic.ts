/**
 * Ambient Pause Screen Lo-Fi Drone
 */
export class PauseMusic {
  private ac: AudioContext;
  private dest: AudioNode;
  private oscs: OscillatorNode[] = [];
  private gain: GainNode;

  constructor(ac: AudioContext, dest: AudioNode) {
    this.ac = ac;
    this.dest = dest;
    this.gain = ac.createGain();
    this.gain.gain.value = 0;
    this.gain.connect(dest);
  }

  public start() {
    this.stop();
    const freqs = [110, 164.81, 220, 329.63];
    this.oscs = freqs.map((f) => {
      const o = this.ac.createOscillator();
      o.type = 'sine';
      o.frequency.value = f;
      o.connect(this.gain);
      o.start();
      return o;
    });
    this.gain.gain.setTargetAtTime(0.08, this.ac.currentTime, 0.4);
  }

  public stop() {
    this.gain.gain.setTargetAtTime(0, this.ac.currentTime, 0.2);
    setTimeout(() => {
      this.oscs.forEach((o) => {
        try {
          o.stop();
        } catch {
          /* ignore */
        }
      });
      this.oscs = [];
    }, 250);
  }
}
