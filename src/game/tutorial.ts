/**
 * The practice stretch (#76): a short, skippable lesson before the first ride, on the train
 * parked at Hoyt–Schermerhorn with the doors open.
 *
 *   1. Look around.
 *   2. Spot a change and flag it (a sticker appears on the window across the aisle while you look
 *      away). Here, and only here, the game says whether you got it, and says the real ride won't.
 *   3. Don't show it: Mom watches you, then asks you something; answer like nothing's wrong.
 *   4. Read the doors: a real stop (the doors open after the chime), then the two ticks of a
 *      False Stop (doors before the chime ends; one hard flicker on arrival). Same timings as the
 *      ride (arrive() in gameState).
 *
 * It runs on the first ride (nothing in `gtrain-tutorial` yet) and again from the title screen's
 * "Practice stretch". Nothing in it counts: the ride after it starts fresh (startIntro → newGame).
 */
import type * as THREE from 'three';
import type { GameEngine } from './gameState';
import { audioEngine } from '../audio/audioEngine';
import { shuffle } from './shuffle';
import { how, type InputKind } from '../ui/controls';

export const TUTORIAL_KEY = 'gtrain-tutorial';

/** True once the practice stretch has been finished, skipped or left for the ride. */
export function tutorialSeen(): boolean {
  try {
    return localStorage.getItem(TUTORIAL_KEY) === 'done';
  } catch {
    return true;
  }
}

export function markTutorialSeen() {
  try {
    localStorage.setItem(TUTORIAL_KEY, 'done');
  } catch {
    /* private mode: it just shows again next time */
  }
}

export type TutorialStep = 'look' | 'flag' | 'mask' | 'doors' | 'ready';
const ORDER: TutorialStep[] = ['look', 'flag', 'mask', 'doors', 'ready'];

/** What the coach card shows. */
export interface TutorialView {
  step: TutorialStep;
  /** 1-4 for the lessons, 4 for "ready". */
  index: number;
  total: number;
  title: string;
  body: string;
  /** The step is done: Next (or Enter) moves on; it also moves on by itself after a moment. */
  canNext: boolean;
}

/**
 * The window across the aisle, a little to your right (subwayCarBuilder panes, x ≈ 1.9). Not the
 * one straight ahead: that one is behind Dad's head, and he can block it.
 */
const PANE = 3;
/** Look this far left or right (rad) to tick off step 1. */
const LOOK = 1.0;

export class Tutorial {
  public step: TutorialStep = 'look';
  public view: TutorialView;
  /** Seconds into the current step. */
  public t = 0;
  public lookedLeft = false;
  public lookedRight = false;
  public plantedAt: number | null = null;
  public flagResult: '' | 'hit' | 'miss' = '';
  public maskResult: '' | 'calm' | 'off' | 'slow' = '';
  /** Which door demonstration is playing (0 = intro, 1 real, 2 doors tick, 3 flicker tick, 4 summary). */
  public doorBeat = 0;
  private doneAt: number | null = null;
  private seenFlags = 0;

  constructor(private G: GameEngine) {
    this.view = this.makeView();
    this.enter('look');
  }

  private get touch() {
    return this.G.isTouch;
  }

  /** Control wording comes from src/ui/controls.ts, for this device's input. */
  private get input(): InputKind {
    return this.touch ? 'touch' : 'keyboard';
  }

  private makeView(title = '', body = '', canNext = false): TutorialView {
    const index = Math.min(4, ORDER.indexOf(this.step) + 1);
    return { step: this.step, index, total: 4, title, body, canNext };
  }

  private show(title: string, body: string, canNext = false) {
    this.view = this.makeView(title, body, canNext);
    this.G.refreshUI();
  }

  /** The current step is done: Next appears, and it moves on by itself after `wait` seconds. */
  private complete(title: string, body: string, wait: number) {
    this.doneAt = this.G.GT + wait;
    this.show(title, body, true);
  }

  /** Next (button or Enter): skip the wait after a finished step. */
  public next() {
    if (!this.view.canNext) return;
    if (this.step === 'ready') {
      this.G.finishTutorial(false);
      return;
    }
    this.enter(ORDER[ORDER.indexOf(this.step) + 1]);
  }

  private enter(step: TutorialStep) {
    this.step = step;
    this.t = 0;
    this.doneAt = null;
    const G = this.G;
    switch (step) {
      case 'look':
        this.show(
          'Look around',
          `${how('look', this.input)} to look. Look to your left, then to your right.`
        );
        break;
      case 'flag':
        G.segFlags = [];
        this.seenFlags = 0;
        this.show('Notice', 'Things in the car change while you’re not looking. Turn away from the windows across the aisle for a moment.');
        break;
      case 'mask': {
        this.hidePlant();
        const mom = G.carBuilder.parents[0];
        mom.force = true; // she looks at you
        this.show(
          'Don’t show it',
          'Mom is watching you. While a parent watches, staring at something or whipping your head around raises their Suspicion. Flagging is private: it never does.'
        );
        G.sched(3.5, () => this.askMask());
        break;
      }
      case 'doors':
        G.carBuilder.parents[0].force = false;
        this.show('Read the doors', 'At every stop you can stay on or step off. Watch the doors and listen.');
        this.playDoors();
        break;
      case 'ready':
        this.complete(
          'You’re ready',
          'That’s the practice stretch. Nothing in it counted. Your ride to Court Square starts now.',
          Number.POSITIVE_INFINITY
        );
        break;
    }
  }

  private askMask() {
    if (this.step !== 'mask') return;
    const G = this.G;
    audioEngine.blip();
    G.setSub('<b>Mom:</b> You okay, hon? You look pale.', 7);
    G.presentChoice({
      items: shuffle([
        { txt: 'Just tired.', val: 'calm' },
        { txt: 'Did that window just change?', val: 'off' },
        { txt: 'Someone keeps staring at us.', val: 'off' },
      ]),
      window: 7 + (this.touch ? 1 : 0),
      glitch: 0,
      reshuffle: false,
      onPick: (val) => {
        G.carBuilder.parents[0].force = false;
        this.maskResult = val === 'calm' ? 'calm' : val === null ? 'slow' : 'off';
        if (val === 'calm') {
          G.setSub('<b>You:</b> Just tired. <em>(Mom nods.)</em>', 2.4);
          this.complete('Don’t show it', 'Good. Answer like nothing is wrong, even when something is.', 4);
        } else if (val === null) {
          this.complete('Don’t show it', 'Too slow. On the ride, hesitating raises Suspicion too. Answer like nothing is wrong.', 5);
        } else {
          G.setSub('<em>Mom keeps looking at you.</em>', 2.4);
          this.complete('Don’t show it', 'On the ride, that would raise her Suspicion. Give the ordinary answer, even when something is wrong.', 5);
        }
      },
    });
  }

  /** The same timings as an arrival: chime at 0.35 s, doors at 0.35 + 1.95 (real) or + 1.15 (tick). */
  private playDoors() {
    const G = this.G;
    const beat = (at: number, n: number, title: string, body: string, tick: 'none' | 'doors' | 'flicker') => {
      G.sched(at, () => {
        if (this.step !== 'doors') return;
        this.doorBeat = n;
        G.doorTarget = 0;
        this.show(title, body);
      });
      G.sched(at + 1.6, () => {
        if (this.step !== 'doors') return;
        if (tick === 'flicker') G.flickerUntil = G.GT + 0.16;
        G.sched(0.35, () => audioEngine.chime());
        G.sched(0.35 + (tick === 'doors' ? 1.15 : 1.95), () => {
          if (this.step === 'doors') G.doorTarget = 1;
        });
      });
    };
    beat(1.5, 1, 'A real stop', 'Listen: the chime plays, and the doors open after it finishes.', 'none');
    beat(7, 2, 'A False Stop', 'Now the doors open before the chime finishes. That’s the tick.', 'doors');
    beat(12.5, 3, 'A False Stop', 'Or the lights flicker once, hard, as the train arrives. That’s the other tick.', 'flicker');
    G.sched(18.5, () => {
      if (this.step !== 'doors') return;
      this.doorBeat = 4;
      this.complete(
        'The tick never lies',
        'Stepping off is a trap unless it’s a real stop your parents lead you to. They’re usually right, but not always: when you hear or see the tick, stay on.',
        6
      );
    });
  }

  private hidePlant() {
    const pane = this.G.carBuilder.panes[PANE];
    if (pane) pane.decal.visible = false;
  }

  public update(dt: number) {
    const G = this.G;
    this.t += dt;
    if (this.doneAt !== null && G.GT >= this.doneAt) {
      this.next();
      return;
    }
    if (this.step === 'look' && this.doneAt === null) {
      if (G.yaw > LOOK) this.lookedLeft = true;
      if (G.yaw < -LOOK) this.lookedRight = true;
      if (this.lookedLeft && this.lookedRight) this.complete('Look around', 'Good. You can turn all the way around in your seat, too.', 2.5);
    } else if (this.step === 'flag' && this.doneAt === null) {
      const pane = G.carBuilder.panes[PANE];
      if (!pane) return;
      if (this.plantedAt === null) {
        // Plant it only while you're looking well away from it, like a real anomaly.
        if (this.t > 1 && G.angleTo(pane.decal) > 0.9) {
          const mat = pane.decal.material as THREE.MeshBasicMaterial;
          mat.map = pane.decalTexSticker;
          mat.needsUpdate = true;
          pane.decal.visible = true;
          this.plantedAt = G.GT;
          G.segFlags = [];
          this.show(
            'Notice',
            `Something across the aisle just changed. Find it, then ${how('flag', this.input).replace(/^Hold/, 'hold')} while looking at it.`
          );
        }
        return;
      }
      if (G.segFlags.length > this.seenFlags) {
        const f = G.segFlags[G.segFlags.length - 1];
        this.seenFlags = G.segFlags.length;
        if (f.tid === pane.tid) {
          this.flagResult = 'hit';
          this.complete(
            'Notice',
            'That’s it: a sticker that wasn’t there. Here we tell you. On the ride we won’t: flags are private, and you see how you did on the report at the end.',
            6
          );
        } else {
          this.flagResult = 'miss';
          this.show('Notice', 'Not that. Look for something new on the windows across the aisle.');
        }
      }
    }
  }

  /** Leaving the lesson (finished, skipped, or the ride restarted): put the car back. */
  public cleanUp() {
    this.hidePlant();
    this.G.carBuilder.parents[0].force = false;
    this.G.doorTarget = 1;
    this.G.flickerUntil = -1;
  }
}
