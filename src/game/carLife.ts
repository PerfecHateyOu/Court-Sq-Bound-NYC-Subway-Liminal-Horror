/**
 * Car life: the small things that make the car feel lived in, without moving anyone.
 *
 * - Every visible passenger leans with the train: back when it pulls away, forward when it
 *   brakes, settling with a little spring. Standing riders lean and sway more than seated ones.
 *   Positions never change, so the "moved" and "extra" anomalies still read as wrong.
 * - A few outfits from the #74 lineup have a habit: headphones nod along (hoodie, puffer), the
 *   texter flicks her thumb, the office worker turns a page, the MTA worker glances at his radio.
 *   The overcoat stays still on purpose, and the woman on your bench has no habit so her
 *   face-turn anomaly can't be mistaken for one.
 * - Habits stop while a passenger's head belongs to something else: a stare, the chorus, a flash
 *   startle, or an anomaly. Parents keep their own heads (watching you is the game).
 *
 * - Everyone breathes: a ±0.4% rise and fall, slow and perfectly regular, so it can never be
 *   mistaken for something changing. Off under Reduced screen effects, and for the still figures.
 *
 * Head habits are added after the gaze code runs and removed again before it runs (stripHeads),
 * so they never pile up on the gaze.
 */
import type * as THREE from 'three';
import type { PersonObject } from '../types';
import { seededRandom } from '../graphics/characterBuilder';

type Life = NonNullable<PersonObject['life']>;

export interface CarLifeContext {
  dt: number;
  gt: number;
  /** Train speed (m/s) and top speed; the train travels toward +x. */
  speed: number;
  topSpeed: number;
  /** Screen effects Reduced: no rhythmic sway (the lean with braking stays; it's slow). */
  reduced: boolean;
  /** Figures that never get habits (the parents, the woman on your bench). */
  noHabits: ReadonlySet<PersonObject>;
  /** Figures that stay perfectly still (the silent extra passenger). */
  still: ReadonlySet<PersonObject>;
}

const LEAN_PER_ACCEL = 0.014; // rad per m/s²
const LEAN_MAX = 0.05;
const SEATED = 0.35;
/** Breathing: rise and fall of the figure (fraction of its height) and breaths per second. */
const BREATH_AMP = 0.004;
const BREATH_HZ = 0.24;

const HABIT: Record<string, Life['act']> = { hoodie: 'nod', puffer: 'nod', texter: 'scroll', office: 'page', mta: 'radio' };

const rand = (a: number, b: number) => a + Math.random() * (b - a);

export class CarLife {
  private lastSpeed = 0;
  private accel = 0;

  /** Smoothed train acceleration (m/s²), for tests and the debug overlay. */
  public get acceleration() {
    return this.accel;
  }

  private lifeOf(p: PersonObject, gt: number): Life {
    if (!p.life) {
      const tagged: THREE.Object3D[] = [];
      p.g.traverse((o) => {
        if (o.userData.habit) tagged.push(o);
      });
      const prop = tagged[0] ?? null;
      const act = HABIT[p.archetype || ''] || '';
      p.life = {
        lean: 0,
        leanVel: 0,
        phase: seededRandom(p.tid)() * Math.PI * 2, // the same rhythm for this passenger every ride
        headX: 0,
        headY: 0,
        nextAt: gt + rand(1, 8),
        startT: 0,
        untilT: 0,
        act: '',
        prop,
        propBase: prop ? (act === 'page' ? prop.rotation.y : prop.rotation.x) : 0,
      };
    }
    return p.life;
  }

  /** Take this frame's head habit back off before the gaze code sets the heads. */
  public stripHeads(people: PersonObject[]) {
    for (const p of people) {
      if (!p.life || (!p.life.headX && !p.life.headY)) continue;
      p.head.rotation.x -= p.life.headX;
      p.head.rotation.y -= p.life.headY;
      p.life.headX = 0;
      p.life.headY = 0;
    }
  }

  /** A new ride: everyone upright, props where they started, habits start fresh. */
  public reset(people: PersonObject[], gt: number) {
    this.stripHeads(people);
    this.lastSpeed = 0;
    this.accel = 0;
    for (const p of people) {
      if (!p.life) continue;
      this.endHabit(p, p.life, gt);
      p.life.lean = 0;
      p.life.leanVel = 0;
      p.g.rotation.x = 0;
      p.g.rotation.z = 0;
      p.g.scale.y = 1;
    }
  }

  public update(people: PersonObject[], c: CarLifeContext) {
    const dt = Math.max(1e-4, c.dt);
    const raw = (c.speed - this.lastSpeed) / dt;
    this.lastSpeed = c.speed;
    // Speed is set per frame from the ride curve; smooth so a jump between stretches can't kick.
    this.accel += (Math.max(-6, Math.min(6, raw)) - this.accel) * Math.min(1, dt * 4);
    const sf = Math.max(0, Math.min(1, c.speed / c.topSpeed));

    for (const p of people) {
      if (!p.g.visible) continue;
      const life = this.lifeOf(p, c.gt);
      if (c.still.has(p) || p.frozen) {
        p.g.rotation.x = 0;
        p.g.rotation.z = 0;
        p.g.scale.y = 1;
        continue;
      }
      p.g.scale.y = c.reduced ? 1 : 1 + BREATH_AMP * Math.sin(c.gt * BREATH_HZ * Math.PI * 2 + life.phase);

      // Lean along the train (inertia), with a little spring so it settles naturally.
      const k = p.standing ? 1 : SEATED;
      const target = Math.max(-LEAN_MAX, Math.min(LEAN_MAX, LEAN_PER_ACCEL * this.accel)) * k;
      life.leanVel += ((target - life.lean) * 30 - life.leanVel * 7) * dt;
      life.lean += life.leanVel * dt;
      // Side-to-side rock at speed (track joints and curves).
      const sway = c.reduced
        ? 0
        : (p.standing ? 0.007 : 0.0025) * sf * (Math.sin(c.gt * 1.25 + life.phase) + 0.35 * Math.sin(c.gt * 2.9 + life.phase * 1.7));
      // World lean about Z (toward -x when accelerating) and sway about X, in the figure's own
      // yaw frame. YXZ keeps rotation.y the plain facing that aimLocal reads.
      if (p.g.rotation.order !== 'YXZ') p.g.rotation.order = 'YXZ';
      const ry = p.g.rotation.y;
      p.g.rotation.x = -life.lean * Math.sin(ry) + sway * Math.cos(ry);
      p.g.rotation.z = life.lean * Math.cos(ry) + sway * Math.sin(ry);

      // Habits.
      const act = HABIT[p.archetype || ''] || '';
      const busy = c.noHabits.has(p) || p.gazeLocked || p.stare || p.twist || p.force || p.mode === 'player';
      if (!act || busy) {
        if (life.act) this.endHabit(p, life, c.gt);
        continue;
      }
      if (!life.act && c.gt >= life.nextAt) this.startHabit(life, act, c.gt);
      if (life.act) this.stepHabit(p, life, c.gt);
    }
  }

  private startHabit(life: Life, act: Life['act'], gt: number) {
    life.act = act;
    life.untilT = gt + (act === 'nod' ? rand(6, 10) : act === 'scroll' ? 0.35 : act === 'page' ? 0.9 : 1.8);
    life.startT = gt;
  }

  private endHabit(p: PersonObject, life: Life, gt: number) {
    const act = life.act || HABIT[p.archetype || ''] || '';
    if (life.prop) {
      if (act === 'page') life.prop.rotation.y = life.propBase;
      else life.prop.rotation.x = life.propBase;
    }
    life.act = '';
    life.nextAt =
      gt + (act === 'nod' ? rand(5, 9) : act === 'scroll' ? rand(1.2, 3) : act === 'page' ? rand(8, 15) : rand(14, 24));
  }

  private stepHabit(p: PersonObject, life: Life, gt: number) {
    const start = life.startT;
    const dur = life.untilT - start;
    const u = Math.max(0, Math.min(1, (gt - start) / dur));
    if (gt >= life.untilT) {
      this.endHabit(p, life, gt);
      return;
    }
    const bump = Math.sin(Math.PI * u); // 0 → 1 → 0
    let hx = 0;
    let hy = 0;
    switch (life.act) {
      case 'nod': {
        // Nodding to the beat, easing in and out of the phrase. ~100 bpm, a little per person.
        const env = Math.min(1, u * 5, (1 - u) * 5);
        const bpm = 96 + (p.tid.charCodeAt(p.tid.length - 1) % 12);
        hx = 0.035 * Math.pow(Math.max(0, Math.sin(2 * Math.PI * (bpm / 60) * (gt - start))), 2) * env;
        break;
      }
      case 'scroll':
        if (life.prop) life.prop.rotation.x = life.propBase - 0.08 * bump;
        hx = 0.012 * bump;
        break;
      case 'page':
        if (life.prop) life.prop.rotation.y = life.propBase + 0.55 * bump;
        break;
      case 'radio':
        // A glance down at the radio on his left chest.
        hx = 0.32 * bump;
        hy = -0.22 * bump;
        break;
    }
    p.head.rotation.x += hx;
    p.head.rotation.y += hy;
    life.headX = hx;
    life.headY = hy;
  }
}

export const carLife = new CarLife();
