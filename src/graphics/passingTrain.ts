/**
 * A train passing the other way on the second track.
 *
 * The far side of the tunnel (+z, behind your seat) is wide enough for a second track, with the
 * column line between. Now and then, mid-cruise, a lit four-car train rushes past the other way.
 * No real lights (the point-light budget stays as it is): the windows are a self-lit texture.
 * It's ambience only. The engine never schedules it near a stop, so it can't be mistaken for the
 * arrival flicker that marks a False Stop, and its odds don't depend on what the next stop is.
 */
import * as THREE from 'three';
import { FORWARD_X } from '../constants';

/** Center line of the second track (the column line is at z = 2.4). */
export const OTHER_TRACK_Z = 4.25;
/** The far wall, pushed out to make room for the second track. */
export const FAR_WALL_Z = 6.1;
const CARS = 4;
const CAR_LEN = 15.5;
export const PASSING_LENGTH = CARS * CAR_LEN;
/** The other train's own speed (m/s); it adds to ours as it passes. */
const OTHER_SPEED = 12;
/** Starts this far ahead and is done once its tail is this far behind (metres, not world x). */
const START_AHEAD = 70;
const END_BEHIND = 40;

function windowTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 1024;
  c.height = 64;
  const g = c.getContext('2d')!;
  g.fillStyle = '#2b2f2d';
  g.fillRect(0, 0, c.width, c.height);
  const carW = c.width / CARS;
  for (let i = 0; i < CARS; i++) {
    const x0 = i * carW;
    // Doors and windows along each car, warm interior light behind them.
    for (let w = 0; w < 6; w++) {
      const wx = x0 + 14 + w * ((carW - 28) / 6);
      g.fillStyle = w % 2 ? '#d9cfa8' : '#efe4bb';
      g.fillRect(wx, 14, (carW - 28) / 6 - 8, 30);
    }
    // Dark gap between cars.
    g.fillStyle = '#0c0d0c';
    g.fillRect(x0 + carW - 4, 0, 8, c.height);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8; // three clamps this to what the GPU supports
  return t;
}

export class PassingTrain {
  public group = new THREE.Group();
  public active = false;
  /**
   * World x of the train's front. It comes from ahead (the Car A end) and runs back toward the
   * Car C end, so it moves along -FORWARD_X; the body trails behind its front, toward FORWARD_X.
   */
  public x = FORWARD_X * START_AHEAD;
  /** Seconds since it started, for the sound and tests. */
  public t = 0;

  constructor(parent: THREE.Object3D) {
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(PASSING_LENGTH, 2.7, 2.7),
      new THREE.MeshLambertMaterial({ color: 0x3a3e3b })
    );
    body.position.set(FORWARD_X * (PASSING_LENGTH / 2), 1.45, 0);
    const windows = new THREE.Mesh(new THREE.PlaneGeometry(PASSING_LENGTH, 0.95), new THREE.MeshBasicMaterial({ map: windowTexture() }));
    // Faces our car (toward -z).
    windows.rotation.y = Math.PI;
    windows.position.set(FORWARD_X * (PASSING_LENGTH / 2), 1.75, -1.36);
    const lamps = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.16, 1.6), new THREE.MeshBasicMaterial({ color: 0xfff1c8 }));
    lamps.position.set(-FORWARD_X * 0.04, 0.8, 0);
    this.group.add(body, windows, lamps);
    this.group.position.set(FORWARD_X * START_AHEAD, 0, OTHER_TRACK_Z);
    this.group.visible = false;
    parent.add(this.group);
  }

  /** Seconds a pass takes at the given speed of our train, start to finish. */
  public static duration(ourSpeed: number) {
    return (START_AHEAD + END_BEHIND + PASSING_LENGTH) / (ourSpeed + OTHER_SPEED);
  }

  public start() {
    this.active = true;
    this.x = FORWARD_X * START_AHEAD;
    this.t = 0;
    this.group.position.x = this.x;
    this.group.visible = true;
  }

  public stop() {
    this.active = false;
    this.group.visible = false;
  }

  /** Move it along; `canShow` is false where there's no tunnel (the trestle). */
  public update(dt: number, ourSpeed: number, canShow: boolean) {
    if (!this.active) return;
    this.t += dt;
    this.x -= FORWARD_X * (ourSpeed + OTHER_SPEED) * dt;
    this.group.position.x = this.x;
    this.group.visible = canShow;
    // Done once its tail (PASSING_LENGTH behind its front) is END_BEHIND metres behind us.
    if (FORWARD_X * this.x + PASSING_LENGTH < -END_BEHIND) this.stop();
  }
}
