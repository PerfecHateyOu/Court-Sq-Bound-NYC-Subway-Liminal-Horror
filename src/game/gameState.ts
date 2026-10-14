/**
 * Game State & Engine Loop for Court Sq-Bound
 * Implements the full v5.1 specification: 13-stop sequence, band-relative scoring,
 * parental gaze/masking, False Stop Trial, Restraint moment, and sensory sabotage.
 */
import * as THREE from 'three';
import {
  BANDS,
  CFG,
  CHATS,
  DRIFT,
  MASK_DIALOGUES,
  PARANOID_UI_WORDS,
  RESTRAINT_GRACE,
  RESTRAINT_RAISE,
  SAN,
  SEGS,
  STOPS,
  SUS,
  TA,
  TD,
  TIER_NAMES,
  V,
  tierOf,
} from '../constants';
import { audioEngine } from '../audio/audioEngine';
import { SubwayCarBuilder } from '../graphics/subwayCarBuilder';
import { TrialBuilder } from '../graphics/trialBuilder';
import { AnomalyManager } from './anomalyManager';
import {
  ActiveAnomaly,
  ChoiceItem,
  ChoiceState,
  GamePhase,
  PersonObject,
  RestraintState,
  RunHistoryRecord,
  SanLogEntry,
  SanSample,
  SegmentDef,
  StopLogRecord,
  SusLogEntry,
  TrialRecord,
  TrialState,
} from '../types';

export class GameEngine {
  public phase: GamePhase = 'menu';
  public GT: number = 0;
  public paused: boolean = false;
  public debug: boolean = false;

  // Kinematics and position
  public segIdx: number = -1;
  public seg: SegmentDef | null = null;
  public ts: number = 0;
  public odo: number = 0;
  public speed: number = 0;
  public bandStop: number = 1;

  // Sanity & Suspicion
  public san: number = 100;
  public sus: number = 0;
  public peak: number = 0;
  public harder: number = 0;
  public interventions: number = 0;
  public intervening: boolean = false;
  public tier: number = 0;

  public susLog: SusLogEntry[] = [];
  public sanLog: SanLogEntry[] = [];
  public sanSamples: SanSample[] = [];
  public stopLog: StopLogRecord[] = [];
  public acc = { correct: 0, fp: 0, miss: 0 };

  // Anomalies & Flags
  public active: ActiveAnomaly[] = [];
  public usedTids: Set<string> = new Set();
  public segFlags: Array<{ tid: string; gt: number }> = [];
  public segSusGain: boolean = false;

  public flagHeld: boolean = false;
  public flagProg: number = 0;
  public flagTid: string | null = null;
  public flagLock: boolean = false;
  public notedT: number = -9;

  // Camera & Gaze
  public gazeTid: string | null = null;
  public dwell: number = 0;
  public dwellReacted: boolean = false;
  public angVel: number = 0;
  public snapArc: number = 0;
  public snapPeak: number = 0;
  public snapCd: number = 0;
  public prevDir: THREE.Vector3 | null = null;

  public yaw: number = 0;
  public pitch: number = -0.05;
  public ty: number = 0;
  public tp: number = -0.05;

  // World elements
  public doorOpen: number = 1;
  public doorTarget: number = 1;
  public flickerUntil: number = -1;
  public dim: number = 1;

  // Systems
  public restraint: RestraintState | null = null;
  public restraintDone: boolean = false;
  public restraintOK: boolean = false;
  public restraintWhy: string = '';

  public trial: TrialState | null = null;
  public trials: TrialRecord[] = [];
  public misleadUsed: boolean = false;
  public misleadStop: number = 9;

  public choice: ChoiceState | null = null;
  public keyHintShown: boolean = false;

  // Audio & Atmosphere Timers
  public subUntil: number = 0;
  public paUntil: number = 0;
  public hintUntil: number = 0;
  public subHtml: string = '';
  public paText: string = '';
  public hintText: string = '';
  public clackD: number = 6;
  public whisperT: number = 20;
  public heartT: number = 0;
  public isTouch: boolean = false;

  // 3D Scene Components
  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;
  public renderer: THREE.WebGLRenderer;
  public carBuilder: SubwayCarBuilder;
  public trialBuilder: TrialBuilder;
  public anomalyMgr: AnomalyManager;

  // Internal helpers
  private Q: Array<{ t: number; fn: () => void }> = [];
  private raycaster = new THREE.Raycaster();
  private centerVec = new THREE.Vector2(0, 0);
  private dirVec = new THREE.Vector3();
  private tmpVec1 = new THREE.Vector3();
  private tmpVec2 = new THREE.Vector3();
  private eyePos = new THREE.Vector3(0, 1.18, 1.08);
  private trialEyePos = new THREE.Vector3(0, 1.6, 2.2);
  private idleTime: number = 0;

  // Event callbacks for UI
  public onStateChange?: () => void;
  public onReportReady?: (runs: RunHistoryRecord[]) => void;

  constructor(scene: THREE.Scene, camera: THREE.PerspectiveCamera, renderer: THREE.WebGLRenderer, isTouch: boolean = false) {
    this.scene = scene;
    this.camera = camera;
    this.renderer = renderer;
    this.isTouch = isTouch;

    this.carBuilder = new SubwayCarBuilder(scene);
    this.carBuilder.buildScene();
    this.trialBuilder = new TrialBuilder(scene);
    this.anomalyMgr = new AnomalyManager(this.carBuilder);

    this.misleadStop = Math.random() < CFG.misleadChance ? 9 : 0;
  }

  public sched(delay: number, fn: () => void) {
    this.Q.push({ t: this.GT + delay, fn });
  }

  public runSched() {
    const due = this.Q.filter((e) => this.GT >= e.t).sort((a, b) => a.t - b.t);
    if (!due.length) return;
    this.Q = this.Q.filter((e) => !due.includes(e));
    due.forEach((e) => e.fn());
  }

  public setSub(html: string, dur: number) {
    this.subHtml = html;
    this.subUntil = this.GT + dur;
    this.notifyUI();
  }

  public setPA(text: string, dur: number) {
    this.paText = text;
    this.paUntil = this.GT + dur;
    this.notifyUI();
  }

  public setHint(text: string, dur: number) {
    this.hintText = text;
    this.hintUntil = this.GT + dur;
    this.notifyUI();
  }

  public say(parentIdx: number, line: string, dur: number = 3.2) {
    const parent = this.carBuilder.parents[parentIdx];
    this.setSub(`<b>${parent.label}:</b> ${line}`, dur);
  }

  private notifyUI() {
    if (this.onStateChange) this.onStateChange();
  }

  /** Head-snap tuning: on touch a snap must be faster and cover a big turn, so a quick swipe isn't a head whip. */
  public get snapThresh(): number {
    return this.isTouch ? CFG.snapThreshTouch : CFG.snapThresh;
  }
  public get snapArcMin(): number {
    return this.isTouch ? CFG.snapArcTouch : CFG.snapArc;
  }

  /**
   * Held inputs can be lost without a key/pointer-up (alt-tab, pause screen, Esc releasing the mouse).
   * Release them, and during the restraint give the player a grace period to re-hold instead of failing it.
   */
  public interruptInputs() {
    this.flagHeld = false;
    if (this.restraint) {
      this.restraint.grace = Math.max(this.restraint.grace, RESTRAINT_GRACE);
    }
  }

  public pause() {
    if (this.paused || this.phase === 'menu' || this.phase === 'end') return;
    this.paused = true;
    this.interruptInputs();
    this.notifyUI();
  }

  public resume() {
    if (!this.paused) return;
    this.paused = false;
    if (this.restraint) {
      this.restraint.grace = Math.max(this.restraint.grace, RESTRAINT_GRACE);
      this.setHint(this.isTouch ? 'Hold the button again. Don’t react.' : 'Hold Space again. Don’t react.', 3.0);
    }
    this.notifyUI();
  }

  public getBand(stop: number): [number, number] {
    const base = BANDS[stop] || [0, 9];
    const b: [number, number] = [base[0], base[1]];
    if (stop >= 11 && this.restraintOK) {
      b[1] += RESTRAINT_RAISE;
    }
    return b;
  }

  public addSanity(d: number, reason: string) {
    const [lo, hi] = this.getBand(this.bandStop);
    const before = this.san;
    this.san = Math.max(lo, Math.min(hi, this.san + d));
    this.sanLog.push({ t: this.GT, d: this.san - before, raw: d, reason });
    this.notifyUI();
  }

  public addSus(n: number, reason: string, watcher?: PersonObject) {
    this.sus = Math.max(0, Math.min(100, this.sus + n));
    if (n > 0) {
      this.peak = Math.max(this.peak, this.sus);
      this.susLog.push({ t: this.GT, n, reason, stop: this.seg ? this.seg.stop : 1 });
      this.segSusGain = true;
    }
    if (watcher) {
      watcher.holdUntil = this.GT + 1.6;
      watcher.until = Math.max(watcher.until || 0, watcher.holdUntil);
    }
    this.notifyUI();
  }

  public sampleSanity() {
    const [lo, hi] = this.getBand(this.bandStop);
    const pos = hi > lo ? Math.max(0, Math.min(1, (this.san - lo) / (hi - lo))) : 1;
    this.sanSamples.push({ stop: this.bandStop, san: this.san, lo, hi, pos });
    const rec = this.stopLog[this.stopLog.length - 1];
    if (rec && rec.san === undefined) {
      rec.san = Math.round(this.san);
      rec.lo = lo;
      rec.hi = hi;
    }
  }

  public getSanityScore(): number {
    if (!this.sanSamples.length) return 0;
    const avg = this.sanSamples.reduce((a, x) => a + x.pos, 0) / this.sanSamples.length;
    return Math.round(100 * avg);
  }

  public newGame() {
    this.Q = [];
    this.GT = 0;
    this.phase = 'intro';
    this.segIdx = -1;
    this.seg = null;
    this.ts = 0;
    this.odo = 0;
    this.bandStop = 1;
    this.san = 100;
    this.sus = 0;
    this.peak = 0;
    this.harder = 0;
    this.interventions = 0;
    this.intervening = false;
    this.tier = 0;
    this.susLog = [];
    this.sanLog = [];
    this.sanSamples = [];
    this.stopLog = [];
    this.acc = { correct: 0, fp: 0, miss: 0 };
    this.active = [];
    this.usedTids = new Set();
    this.segFlags = [];
    this.segSusGain = false;
    this.flagHeld = false;
    this.flagProg = 0;
    this.flagTid = null;
    this.flagLock = false;
    this.notedT = -9;
    this.gazeTid = null;
    this.dwell = 0;
    this.dwellReacted = false;
    this.angVel = 0;
    this.snapArc = 0;
    this.snapPeak = 0;
    this.snapCd = 0;
    this.yaw = 0;
    this.pitch = -0.05;
    this.ty = 0;
    this.tp = -0.05;
    this.doorOpen = 1;
    this.doorTarget = 1;
    this.flickerUntil = -1;
    this.dim = 1;
    this.restraint = null;
    this.restraintDone = false;
    this.restraintOK = false;
    this.restraintWhy = '';
    this.trial = null;
    this.trials = [];
    this.misleadUsed = false;
    this.misleadStop = Math.random() < CFG.misleadChance ? 9 : 0;
    // Clear on-screen text too: with its timer zeroed, expiry never clears leftover text.
    this.subHtml = '';
    this.paText = '';
    this.hintText = '';
    this.subUntil = 0;
    this.paUntil = 0;
    this.hintUntil = 0;
    this.choice = null;
    this.paused = false;

    // Reset world entities
    const cb = this.carBuilder;
    cb.acrossAds.forEach((a) => {
      cb.textureGen.drawAdOnCanvas(a.canvas, a.def, a.def.h);
      a.tex.needsUpdate = true;
    });
    cb.maps.forEach((m) => {
      cb.textureGen.drawRouteMap(m.canvas, 'normal');
      m.tex.needsUpdate = true;
    });
    cb.lightSegs.forEach((l) => l.mat.color.set(0xfff4de));
    cb.panes.forEach((p) => (p.decal.visible = false));

    cb.parents.forEach((p) => {
      p.mode = 'phone';
      p.until = 2 + Math.random() * 3;
      p.holdUntil = 0;
      p.force = false;
      p.frozen = false;
      p.yaw = 0;
      p.pitch = 0.5;
      p.facing = false;
      p.eyes.forEach((e) => e.scale.set(1, 1, 1));
      (p.skMat as THREE.MeshLambertMaterial).color.set(p.skin);
    });

    [...cb.strangers, cb.extraPerson, ...cb.crowd].forEach((s) => {
      s.g.position.copy(s.home);
      s.g.visible = true;
      s.stare = false;
      s.twist = false;
      s.head.rotation.set(s.pose[1], s.pose[0], 0);
      s.head.rotation.z = 0;
    });
    cb.extraPerson.g.visible = false;
    cb.crowd.forEach((c) => (c.g.visible = false));

    cb.worldGroup.visible = true;
    this.trialBuilder.group.visible = false;
    cb.stA.baseX = 0;
    cb.stA.setName(STOPS[1]);
    cb.stB.baseX = 9999;
    cb.stB.setName(STOPS[2]);

    this.notifyUI();
  }

  public startIntro() {
    this.newGame();
    this.phase = 'intro';
    this.doorOpen = 1;
    this.doorTarget = 1;

    // The report screen drops the master level and fades the hum out, and a Trial or the
    // Stop 6 transition thins the bed. A new run (Ride again, or Restart from the pause
    // menu) must start at full ambience.
    audioEngine.setMasterLevel(0.85, 0.3);
    audioEngine.setBedLevel(1.0, 0.3);

    this.sched(1.2, () => this.setPA('This is a Court Square–bound G train.', 4.0));
    this.sched(2.5, () =>
      this.setHint(
        this.isTouch
          ? 'Drag to look around. Hold FLAG while looking at anything that changes.'
          : 'Move the mouse to look. Hold F while looking at anything that changes.',
        7.0
      )
    );
    this.sched(6.0, () => this.say(1, 'Grab a seat. It\u2019s a long one.', 2.8));
    this.sched(9.0, () => {
      this.setPA('Stand clear of the closing doors, please.', 3.0);
      audioEngine.chime();
    });
    this.sched(10.4, () => {
      this.doorTarget = 0;
    });
    this.sched(11.6, () => this.startSegment(0));
    this.notifyUI();
  }

  public startSegment(idx: number) {
    const prev = this.seg;
    if (prev) {
      this.sampleSanity();
      this.odo += this.segDist(prev);
    }

    this.segIdx = idx;
    this.seg = SEGS[idx];
    const seg = this.seg;
    this.phase = 'ride';
    this.ts = 0;
    this.segFlags = [];
    this.segSusGain = false;
    this.bandStop = seg.stop;

    if (this.harder > 0) this.harder--;
    const dVal = DRIFT[seg.stop] ?? SAN.drift;
    this.addSanity(dVal, 'Per-stop drift');

    // Slide station platforms
    const cb = this.carBuilder;
    const tmp = cb.stA;
    cb.stA = prev ? cb.stB : cb.stA;
    cb.stB = prev ? tmp : cb.stB;
    cb.stA.baseX = this.odo;
    cb.stB.baseX = this.odo + this.segDist(seg);
    cb.stB.setName(STOPS[seg.stop]);
    if (seg.stop === 9) cb.stB.setName(STOPS[9]);

    cb.crowd.forEach((c) => (c.g.visible = !!seg.crowd));
    this.planAnomalies(seg);

    seg._masks = (seg.mask || []).map((t) => ({ t, done: false }));
    seg._havenSaid = false;
    seg._screech = false;
    seg._mislead = false;

    audioEngine.setBedLevel(seg.thin ? 0.18 : 1.0, 1.5);
    const L = this.segLen(seg);

    if (!seg.silent) {
      this.sched(7.0, () => this.setPA(`The next stop is ${STOPS[seg.stop]}.`, 4.5));
    }

    if (seg.chat !== undefined) {
      const c = this.tier >= 2 && seg.chat < 3 ? CHATS[3] : CHATS[seg.chat];
      this.sched(15.0, () => this.chatDialogue(c[0]));
      this.sched(18.6, () => this.chatDialogue(c[1]));
    }

    if (seg.final) {
      this.sched(L - 9.0, () => this.setPA('Court Square. This is the last stop on this train.', 5.0));
    }

    this.notifyUI();
  }

  private chatDialogue([who, line]: [number, string]) {
    if (this.choice || this.restraint || this.intervening || this.phase !== 'ride') return;
    this.carBuilder.parents.forEach((p) => {
      if (!p.force && !p.frozen) {
        p.mode = 'other';
        p.until = this.GT + 3.2;
      }
    });
    const speaker = this.carBuilder.parents[who].label;
    const listener = this.carBuilder.parents[1 - who].label;
    this.setSub(`<b>${speaker}:</b> ${line} <em>(to ${listener})</em>`, 3.4);
  }

  private planAnomalies(seg: SegmentDef) {
    this.active = [];
    this.usedTids = new Set();
    const C = seg.cruise || 26;
    const times: number[] = [];
    const n = seg.anoms + (seg.forced ? seg.forced.length : 0);
    for (let i = 0; i < n; i++) {
      times.push(6 + Math.random() * (TA + C - 12));
    }
    times.sort((a, b) => a - b);

    let ti = 0;
    (seg.forced || []).forEach((f) => {
      const id =
        f === 'parent'
          ? Math.random() < 0.5 ? 'momface' : 'dadanswer'
          : f === 'crit'
          ? ['momface', 'dadanswer', 'empty'][Math.floor(Math.random() * 3)]
          : f;
      const anom = this.anomalyMgr.createAnomaly(id, times[ti++]);
      if (anom) {
        anom.tids.forEach((t) => this.usedTids.add(t));
        this.active.push(anom);
      }
    });

    const tier = tierOf(this.san);
    for (let i = 0; i < seg.anoms; i++) {
      const id = this.anomalyMgr.pickPoolTier(tier, seg.stop);
      const anom = this.anomalyMgr.createAnomaly(id, times[ti++]);
      if (anom) {
        anom.tids.forEach((t) => this.usedTids.add(t));
        this.active.push(anom);
      }
    }
  }

  private scoreSegment(): StopLogRecord {
    const seg = this.seg!;
    const rec: StopLogRecord = {
      stop: seg.stop,
      b: !!seg.b,
      name: STOPS[seg.stop],
      anoms: [],
      fps: [],
      doors: null,
    };

    let dS = 0;
    this.active.forEach((a) => {
      if (a.at === null) {
        a.revert();
        return;
      }
      const hit = this.segFlags.some((f) => a.tids.includes(f.tid) && f.gt >= a.at!);
      if (hit) {
        this.acc.correct++;
        dS += SAN.clock;
      } else {
        this.acc.miss++;
        dS += SAN.miss;
      }
      rec.anoms.push({ desc: a.desc, hit });
      a.revert();
    });

    const fps = this.segFlags.filter((f) => !this.active.some((a) => a.at !== null && a.tids.includes(f.tid) && f.gt >= a.at));
    this.acc.fp += fps.length;
    rec.fps = fps.map((f) => this.carBuilder.targetLabels[f.tid] || f.tid);
    dS += SAN.falsePos * Math.min(fps.length, 2);

    if (dS) this.addSanity(dS, `Stop ${seg.stop} anomalies`);
    if (!this.segSusGain && this.sus > 0) this.addSus(SUS.clean, 'Clean stop');

    this.active = [];
    this.usedTids = new Set();
    if (!this.restraint && !this.intervening) {
      this.carBuilder.strangers.forEach((s) => (s.g.visible = true));
    }

    this.stopLog.push(rec);
    return rec;
  }

  public arrive() {
    const seg = this.seg!;
    this.phase = 'stop';
    const rec = this.scoreSegment();

    if (seg.final) {
      this.sched(0.4, () => audioEngine.chime());
      this.sched(2.3, () => {
        this.doorTarget = 1;
      });
      this.sched(3.4, () => this.say(0, 'Here we are. Court Square.', 3.0));
      this.sched(6.5, () => this.endGame());
      return;
    }

    const tick = seg.type === 'false' ? seg.tick : null;
    rec.type = seg.type || 'real';
    rec.tick = tick;
    rec.mislead = !!seg._mislead;
    rec.bait = !!seg.bait;
    rec.paLie = !!seg.paLie;

    if (tick === 'flicker') this.flickerUntil = this.GT + 0.16;

    if (seg.paLie) {
      this.sched(0.2, () => this.setPA(seg.paLie!, 5.0));
    } else if (!seg.silent && seg.type !== 'false') {
      this.sched(0.9, () => this.setPA(`This is ${STOPS[seg.stop]}.`, 3.0));
    }

    this.sched(0.35, () => audioEngine.chime());
    const openAt = 0.35 + (tick === 'doors' ? 1.15 : 1.95);

    if (seg.bait) {
      this.sched(openAt - 0.05, () => this.say(0, 'This is us. Come on, get up.', 3.0));
    }

    this.sched(openAt, () => {
      this.doorTarget = 1;
    });
    this.sched(openAt + 0.9, () => this.presentDoorChoice(rec));
    this.notifyUI();
  }

  private presentDoorChoice(rec: StopLogRecord) {
    const t = tierOf(this.san);
    const win = (t >= 2 ? 4.0 : 5.0) + (this.isTouch ? 0.5 : 0);
    this.presentChoice({
      items: [
        { txt: 'Stay on', val: 'stay' },
        { txt: 'Step off', val: 'off' },
      ],
      window: win,
      glitch: [0, 0.05, 0.2, 0.35][t],
      onPick: (val) => this.resolveDoors(rec, val || 'stay'),
    });
  }

  private resolveDoors(rec: StopLogRecord, choice: 'stay' | 'off') {
    const seg = this.seg!;
    rec.doors = choice;

    if (rec.type === 'real') {
      rec.correct = choice === 'stay';
      if (choice === 'off') {
        this.addSus(SUS.falsePos, `Stepped off at ${STOPS[seg.stop]}, a real stop`, this.carBuilder.parents[0]);
        this.addSanity(SAN.falsePos, 'Stepped off at a real stop');
        this.say(0, 'Hey! Where are you going? Get back in here.', 3.0);
        this.sched(3.2, () => this.departNext());
      } else {
        this.departNext();
      }
    } else if (rec.type === 'haven') {
      rec.correct = choice === 'off';
      if (choice === 'off') {
        this.executeSafeHaven();
      } else {
        this.addSus(SUS.refuseHaven, 'Refused to step off when your parents asked', this.carBuilder.parents[0]);
        this.say(0, 'You don\u2019t want to stretch your legs? \u2026Okay.', 3.0);
        this.sched(3.2, () => this.departNext());
      }
    } else {
      // False Stop
      rec.correct = choice === 'stay';
      if (choice === 'stay') {
        this.departNext();
      } else if (seg.forgiving) {
        this.addSus(SUS.maskFail, 'Stepped off at a False Stop', this.carBuilder.parents[0]);
        this.setSub('<em>Mom grabs your sleeve.</em> <b>Mom:</b> Not this one, hon. The doors opened funny.', 3.8);
        this.sched(3.8, () => this.departNext());
      } else {
        this.startTrial();
      }
    }
  }

  private departNext() {
    if (this.phase === 'end') return;
    this.setPA('Stand clear of the closing doors, please.', 3.0);
    audioEngine.chime();
    this.sched(1.4, () => {
      this.doorTarget = 0;
    });
    this.sched(2.6, () => this.startSegment(this.segIdx + 1));
  }

  private executeSafeHaven() {
    this.phase = 'haven';
    audioEngine.setBedLevel(2.2, 0.4);
    this.sched(2.0, () => audioEngine.setBedLevel(0.18, 2.4));
    this.sched(0.8, () => this.say(0, 'Feels good to stand up, right?', 2.6));
    this.sched(3.5, () => this.say(1, 'Couple more stops after this. Then Court Square.', 2.8));
    this.sched(6.4, () => {
      this.addSanity(SAN.haven, 'Safe Haven');
      this.setSub('<em>You get back on with them.</em>', 2.0);
    });
    this.sched(7.4, () => {
      this.phase = 'stop';
      this.departNext();
    });
  }

  public startMaskCheck() {
    const t = tierOf(this.san);
    const set = t <= 1 ? MASK_DIALOGUES[t === 0 ? 0 : Math.random() < 0.5 ? 0 : 1] : t === 2 ? MASK_DIALOGUES[1] : MASK_DIALOGUES[2];
    const pool = set.filter((l) => !l.needsSus || this.sus >= 10);
    const L = pool[Math.floor(Math.random() * pool.length)];
    const p = this.carBuilder.parents[L.who];

    p.force = true;
    audioEngine.blip();
    this.setSub(`<b>${p.label}:</b> ${L.line}`, 6.0);

    const win = (this.harder > 0 ? 3.0 : 4.0) + (this.isTouch ? 0.5 : 0);
    const items: ChoiceItem[] = [
      { txt: L.calm, val: 'calm' },
      { txt: L.off[0], val: 'off' },
      { txt: L.off[1], val: 'off' },
    ].sort(() => Math.random() - 0.5);

    this.presentChoice({
      items,
      window: win,
      glitch: [0, 0.1, 0.35, 0.6][t] + (this.harder > 0 ? 0.15 : 0),
      reshuffle: t >= 2,
      onPick: (val, rt) => {
        if (val === null) {
          this.addSus(SUS.timeout, `Hesitated when ${p.label} asked a question`, p);
          this.addSanity(SAN.timeout, 'Mask timeout');
          this.setSub(`<em>You don\u2019t answer fast enough.</em> <b>${p.label}:</b> Hon?`, 2.6);
          this.sched(2.6, () => this.releaseParent(p));
        } else if (val === 'calm') {
          this.setSub(`<b>You:</b> ${L.calm} <em>(${p.label} nods.)</em>`, 2.4);
          this.sched(1.2, () => this.releaseParent(p));
        } else {
          this.addSus(SUS.maskFail, `Gave an odd answer to ${p.label}`, p);
          this.addSanity(SAN.maskFail, 'Mask fail');
          this.setSub(`<em>${p.label} keeps looking at you.</em>`, 2.8);
          this.sched(3.2, () => this.releaseParent(p));
        }
      },
    });
  }

  private releaseParent(p: PersonObject) {
    p.force = false;
    p.holdUntil = this.GT + 0.5;
    p.until = this.GT + 0.5;
  }

  private triggerConcernedIntervention() {
    this.intervening = true;
    this.interventions++;
    this.carBuilder.parents.forEach((p) => {
      if (!p.frozen) p.force = true;
    });
    this.flagHeld = false;

    this.say(1, 'Hey. Look at me. Both of us, right now.', 2.6);
    this.sched(2.7, () => this.say(0, 'Talk to us. What is going on with you?', 3.0));
    this.sched(5.9, () => this.setSub('<b>You:</b> Nothing. I\u2019m okay. I promise.', 2.4));
    this.sched(8.4, () => {
      this.carBuilder.parents.forEach((p) => this.releaseParent(p));
      this.intervening = false;
      this.addSanity(SAN.intervention, 'Concerned Intervention');
      this.sus = 40;
      this.susLog.push({ t: this.GT, n: 0, reason: 'Concerned Intervention (suspicion reset to 40)', stop: this.seg!.stop });
    });
  }

  public startRestraintMoment() {
    this.restraint = {
      t: 0,
      started: false,
      wait: 0,
      dur: 15,
      failed: false,
      beats: 0,
      grace: 0,
    };
    this.setHint(
      this.isTouch ? 'Hold the button. Don\u2019t let go. Don\u2019t react.' : 'Hold Space. Don\u2019t let go. Don\u2019t react.',
      6.0
    );
    this.notifyUI();
  }

  private updateRestraint(dt: number) {
    const R = this.restraint;
    if (!R) return;

    if (R.grace > 0) {
      R.grace -= dt;
      if (!this.flagHeld) return;
    }

    if (!R.started) {
      R.wait += dt;
      if (this.flagHeld) {
        R.started = true;
      } else if (R.wait > 5.0) {
        this.endRestraint(false, 'You couldn\u2019t keep it together');
      }
      return;
    }

    if (!this.flagHeld && R.t < R.dur) {
      this.endRestraint(false, 'You let go');
      return;
    }

    R.t += dt;
    this.dim = Math.max(0.4, Math.min(1, 1 - R.t / 6));

    const beat = (at: number, fn: () => void) => {
      if (R.t >= at && R.beats < at) {
        R.beats = at;
        fn();
      }
    };

    beat(1.5, () => {
      const mom = this.carBuilder.parents[0];
      mom.frozen = true;
      mom.eyes.forEach((e) => e.scale.set(2.2, 2.2, 1.8));
      (mom.skMat as THREE.MeshLambertMaterial).color.set(0xdfd9ce);
      if (mom.phone) mom.phone.visible = false;
    });
    beat(4.0, () => this.setSub('<b>Dad:</b> No. We\u2019re not getting off. You know that.', 3.2));
    beat(7.0, () => {
      this.carBuilder.strangers.forEach((s) => (s.g.visible = false));
      this.carBuilder.crowd.forEach((c) => (c.g.visible = false));
      audioEngine.whisper(3.0);
    });
    beat(10.5, () => this.setSub('<b>Mom</b> <em>(her mouth doesn\u2019t move)</em>: You can stop pretending.', 3.4));

    if (R.t >= R.dur) {
      this.endRestraint(true, 'Held');
    }
  }

  private endRestraint(ok: boolean, why: string) {
    this.restraint = null;
    this.restraintDone = true;
    this.restraintOK = ok;
    this.restraintWhy = ok ? 'Held' : why;
    this.dim = 1;

    const liveId = (id: string) => this.active.some((a) => a.id === id && a.at !== null);
    if (!liveId('momface')) {
      const mom = this.carBuilder.parents[0];
      mom.frozen = false;
      mom.eyes.forEach((e) => e.scale.set(1, 1, 1));
      (mom.skMat as THREE.MeshLambertMaterial).color.set(mom.skin);
    }
    if (!liveId('empty')) {
      this.carBuilder.strangers.forEach((s) => (s.g.visible = true));
    }

    if (ok) {
      this.addSanity(SAN.restraintOK, 'Restraint held');
      this.setSub('<em>The lights come back. Everyone is where they were.</em>', 3.0);
    } else {
      this.addSus(15, 'Lost your composure during the restraint moment', this.carBuilder.parents[1]);
      this.addSanity(SAN.restraintFail, 'Restraint failed');
      this.setSub('<em>You flinch. Dad sees it.</em>', 3.0);
    }
    this.notifyUI();
  }

  // False Stop Trial
  public startTrial() {
    this.phase = 'trial';
    this.trial = {
      depth: 0,
      need: 2,
      mode: 'paths',
      cyc: 0,
      correct: 0,
      events: [],
      picks: [],
      stopName: STOPS[this.seg!.stop],
      stepT: 2,
    };

    this.carBuilder.worldGroup.visible = false;
    this.trialBuilder.group.visible = true;
    this.ty = 0;
    this.tp = 0;
    this.yaw = 0;
    this.pitch = 0;

    audioEngine.setBedLevel(0.05, 0.5);
    this.newTrialRound();
    this.setHint('Find the way back. The signs lie. Watch the lights when the chime plays.', 6.0);
    this.notifyUI();
  }

  private newTrialRound() {
    const tr = this.trial!;
    const d = tr.depth;
    tr.correct = tr.mode === 'paths' ? Math.floor(Math.random() * 3) : Math.random() < 0.5 ? 0 : 2;

    const signsPool = [
      ['To Court Sq trains', 'Exit', 'To Church Av trains'],
      ['To Court Sq trains', 'To Court Sq trains', 'To Court Sq trains'],
      ['To Cort Sq trians', 'Ext', 'To You'],
      ['Hoyt\u2013Schermerhorn', 'Hoyt\u2013Schermerhorn', 'Hoyt\u2013Schermerhorn'],
    ];
    const signs = [...signsPool[Math.min(d, 3)]].sort(() => Math.random() - 0.5);

    this.trialBuilder.open.forEach((o, i) => {
      const isDoor = tr.mode === 'board' && i !== 1;
      this.trialBuilder.setSignText(o, tr.mode === 'board' ? (i === 1 ? '—' : 'Court Sq-bound G') : signs[i]);
      o.interior.visible = isDoor;
      o.leaves.forEach((l) => {
        l.lg.visible = isDoor;
        l.lg.position.x = l.x0;
      });
      o.openAmt = 0;
      o.target = 0;
      o.flickUntil = -1;
    });

    this.trialBuilder.tileMat.color.setHSL(0.12 - d * 0.03, 0.25 + d * 0.12, 0.9 - d * 0.12);
    tr.cyc = 3.2;

    const pathLabels = [
      ['Left stairs', 'Turnstiles', 'Right stairs'],
      ['Left stairs', 'Middle stairs', 'Right stairs'],
      ['Down', 'Down', 'Down'],
    ];
    const labels = tr.mode === 'paths' ? pathLabels[Math.min(d, 2)] : ['Board the left train', 'Board the right train'];
    const items: ChoiceItem[] =
      tr.mode === 'paths'
        ? labels.map((t, i) => ({ txt: t, val: i }))
        : [{ txt: labels[0], val: 0 }, { txt: labels[1], val: 2 }];

    const win = d === 0 ? Infinity : Math.max(7, 14 - d * 2);
    this.presentChoice({
      items,
      window: win,
      glitch: d * 0.18,
      onPick: (val) => this.onTrialPick(val),
    });
  }

  private trialCycle() {
    const tr = this.trial!;
    audioEngine.chime();
    tr.events = [];
    if (tr.mode === 'paths') {
      tr.events.push({ at: 0, i: tr.correct, kind: 'flick' });
      [0, 1, 2]
        .filter((i) => i !== tr.correct)
        .forEach((i) => tr.events.push({ at: 0.8 + Math.random() * 2.2, i, kind: 'flick' }));
      if (tr.depth >= 1) {
        const decoy = [0, 1, 2].filter((i) => i !== tr.correct)[Math.floor(Math.random() * 2)];
        tr.events.push({ at: 0.22 + Math.random() * 0.13, i: decoy, kind: 'flick' });
      }
    } else {
      const fake = tr.correct === 0 ? 2 : 0;
      tr.events.push(
        { at: 1.95, i: tr.correct, kind: 'open' },
        { at: 1.15, i: fake, kind: 'open' },
        { at: 3.2, i: 0, kind: 'close' },
        { at: 3.2, i: 2, kind: 'close' }
      );
    }
  }

  private updateTrial(dt: number) {
    const tr = this.trial;
    if (!tr || !this.trialBuilder.group.visible) return;

    tr.cyc += dt;
    if (tr.cyc >= 3.6) {
      tr.cyc -= 3.6;
      this.trialCycle();
    }

    tr.events.forEach((e) => {
      if (!e.done && tr.cyc >= e.at) {
        e.done = true;
        const o = this.trialBuilder.open[e.i];
        if (e.kind === 'flick') o.flickUntil = this.GT + 0.14;
        else if (e.kind === 'open') o.target = 1;
        else o.target = 0;
      }
    });

    this.trialBuilder.open.forEach((o) => {
      const off = this.GT < o.flickUntil;
      o.lmat.color.set(off ? 0x111111 : 0xfff2d6);
      o.pl.intensity = off ? 0 : 0.9;
      o.openAmt += (o.target - o.openAmt) * (1 - Math.exp(-9 * dt));
      o.leaves.forEach((l) => (l.lg.position.x = l.x0 + l.s * 0.75 * o.openAmt));
    });

    tr.stepT -= dt;
    if (tr.depth >= 1 && tr.stepT <= 0) {
      tr.stepT = (1.2 + Math.random() * 2.3) / tr.depth;
      audioEngine.step();
    }

    this.camera.position.copy(this.trialEyePos);
    if (this.camera.aspect < 1) this.camera.position.z = 3.3;
    this.camera.rotation.z = Math.sin(this.GT * 0.7) * 0.012 * tr.depth;
  }

  private onTrialPick(val: any) {
    const tr = this.trial!;
    const ok = val === tr.correct;
    tr.picks.push({ mode: tr.mode, ok });

    this.sched(0.7, () => {
      if (tr.mode === 'paths') {
        if (ok) {
          tr.need--;
          this.setSub(
            tr.need > 0 ? '<em>The stairs go down to another platform.</em>' : '<em>You come out at the platform edge. Two trains are coming.</em>',
            3.0
          );
          if (tr.need <= 0) tr.mode = 'board';
        } else {
          tr.depth++;
          tr.need = Math.min(tr.need + 1, 3);
          this.setSub('<em>The stairs bring you back up onto the same platform. It\u2019s quieter now.</em>', 3.2);
        }
      } else {
        if (ok) {
          this.exitTrial(true);
          return;
        }
        tr.depth++;
        tr.mode = 'paths';
        tr.need = 1;
        this.setSub('<em>The doors close on nothing. You\u2019re back on the stairs.</em>', 3.2);
      }

      if (tr.depth >= 4) {
        this.exitTrial(false);
        return;
      }
      this.newTrialRound();
    });
  }

  private exitTrial(clean: boolean) {
    const tr = this.trial!;
    this.trials.push({ stop: this.seg!.stop, depth: tr.depth, clean });

    this.sched(0.2, () => {
      this.trialBuilder.group.visible = false;
      this.carBuilder.worldGroup.visible = true;
      this.ty = 0;
      this.tp = -0.05;
      this.yaw = 0;
      this.pitch = -0.05;
      this.prevDir = null;
      this.angVel = 0;
      this.snapArc = 0;
      this.snapPeak = 0;
      this.snapCd = 1.5;

      this.addSus(SUS.falsePos, `Walked off the train at ${STOPS[this.seg!.stop]}`, this.carBuilder.parents[0]);
      this.phase = 'stop';
      this.trial = null;
      this.addSanity(SAN.trial, 'Returned from a False Stop Trial');
      this.harder = 3;

      audioEngine.setBedLevel(1.0, 1.0);
      this.setSub(
        clean
          ? '<b>Mom:</b> Where did you go?! You can\u2019t just walk off like that!'
          : '<em>You don\u2019t remember getting back on.</em> <b>Mom:</b> Oh my god. Where were you?',
        3.4
      );
      this.sched(3.6, () => this.say(1, 'Sit. Stay where we can see you.', 2.6));
      this.sched(6.4, () => this.departNext());
    });
  }

  public presentChoice(options: {
    items: ChoiceItem[];
    window: number;
    glitch?: number;
    reshuffle?: boolean;
    onPick: (val: any, rt: number) => void;
  }) {
    this.choice = {
      items: options.items,
      window: options.window,
      left: options.window,
      glitch: options.glitch || 0,
      reshuffle: options.reshuffle || false,
      reshuffled: false,
      gT: 0,
      keyMap: options.items.map((_, i) => i),
      onPick: options.onPick,
    };
    this.notifyUI();
  }

  public pickChoiceIndex(i: number) {
    const C = this.choice;
    if (!C) return;
    this.choice = null;
    const rt = C.window - C.left;
    C.onPick(i < 0 ? null : C.items[i].val, rt);
    this.notifyUI();
  }

  public endGame() {
    this.phase = 'end';
    this.flagHeld = false;
    audioEngine.setMasterLevel(0.2, 0.8);
    audioEngine.setBedLevel(0.0001, 0.7);

    this.sampleSanity();
    const runs = this.loadRuns();
    runs.push({
      date: Date.now(),
      san: this.san,
      sanPct: this.getSanityScore(),
      peak: this.peak,
      acc: this.acc,
      trials: this.trials.length,
    });
    this.saveRuns(runs);

    if (this.onReportReady) {
      this.onReportReady(runs);
    }
    this.notifyUI();
  }

  private loadRuns(): RunHistoryRecord[] {
    try {
      return JSON.parse(localStorage.getItem('gtrain-runs') || '[]');
    } catch (e) {
      return [];
    }
  }

  private saveRuns(runs: RunHistoryRecord[]) {
    try {
      localStorage.setItem('gtrain-runs', JSON.stringify(runs.slice(-50)));
    } catch (e) {}
  }

  public update(dt: number) {
    this.GT += dt;
    this.runSched();

    // Sanity tier drives visuals, audio, parent behaviour and the haven cue. Recompute it
    // every frame, and tell the UI when it changes so the tier color grading follows.
    if (this.phase !== 'menu' && this.phase !== 'end') {
      const tier = tierOf(this.san);
      if (tier !== this.tier) {
        this.tier = tier;
        this.notifyUI();
      }
    }

    if (this.phase === 'trial') {
      const k = 1 - Math.exp(-22 * dt);
      this.yaw += (this.ty - this.yaw) * k;
      this.pitch += (this.tp - this.pitch) * k;
      this.camera.rotation.set(this.pitch, this.yaw, this.camera.rotation.z);
      this.updateTrial(dt);
      this.applyLighting();
    } else if (this.phase !== 'haven' && this.phase !== 'menu') {
      this.updateCar(dt);
    } else if (this.phase === 'menu') {
      this.updateMenuIdle(dt);
    }

    this.updateChoiceTimer(dt);

    // Subtitle expiry
    if (this.subUntil && this.GT > this.subUntil) {
      this.subHtml = '';
      this.subUntil = 0;
    }
    if (this.paUntil && this.GT > this.paUntil) {
      this.paText = '';
      this.paUntil = 0;
    }
  }

  private updateChoiceTimer(dt: number) {
    const C = this.choice;
    if (!C) return;
    C.left -= dt;
    if (isFinite(C.window) && C.left <= 0) {
      this.pickChoiceIndex(-1);
      return;
    }

    if (C.glitch > 0) {
      C.gT -= dt;
      if (C.gT <= 0) {
        C.gT = 0.18;
        if (Math.random() < C.glitch * 0.4) {
          // Trigger dynamic glitch re-render in UI
          this.notifyUI();
        }
      }
    }
  }

  private updateMenuIdle(dt: number) {
    this.idleTime += dt;
    this.camera.position.copy(this.eyePos);
    this.camera.rotation.set(-0.05 + Math.sin(this.idleTime * 0.13) * 0.03, Math.sin(this.idleTime * 0.09) * 0.35, 0);
    this.updateParents(dt, false);
    this.applyLighting();
    this.placeWorld(0, 0);
  }

  private updateCar(dt: number) {
    const seg = this.seg;
    let speed = 0;
    let pos = this.odo;

    if (this.phase === 'ride' && seg) {
      this.ts += dt;
      speed = this.segVel(seg, this.ts);
      pos = this.odo + this.segPos(seg, this.ts);
    } else if (seg && this.phase !== 'intro') {
      pos = this.odo + this.segDist(seg);
    }

    this.speed = speed;
    const sf = speed / V;

    // Camera look interpolation
    const k = 1 - Math.exp(-22 * dt);
    this.yaw += (this.ty - this.yaw) * k;
    this.pitch += (this.tp - this.pitch) * k;

    // Train physical bounce and breathing
    const breathe = this.tier >= 2 ? Math.sin(this.GT * 0.5) * 0.01 * (this.tier - 1) : 0;
    this.camera.position.set(
      this.eyePos.x,
      this.eyePos.y + Math.sin(this.GT * 9.3) * 0.0035 * sf + Math.sin(this.GT * 1.7) * 0.004 * sf,
      this.eyePos.z
    );
    this.camera.rotation.set(this.pitch, this.yaw, Math.sin(this.GT * 0.9) * 0.006 * sf + breathe);
    this.camera.updateMatrixWorld();

    this.camera.getWorldDirection(this.dirVec);

    // Head-snap detection
    if (this.prevDir && dt > 0) {
      const da = this.dirVec.angleTo(this.prevDir);
      const a = da / dt;
      this.angVel = this.angVel * 0.55 + a * 0.45;
      if (this.angVel > this.snapThresh * 0.4) {
        this.snapArc += da;
        this.snapPeak = Math.max(this.snapPeak, this.angVel);
      } else {
        this.snapArc = 0;
        this.snapPeak = 0;
      }
    }
    this.prevDir = (this.prevDir || new THREE.Vector3()).copy(this.dirVec);

    // Center gaze raycasting
    this.raycaster.setFromCamera(this.centerVec, this.camera);
    const activeTargets = this.carBuilder.getActiveTargets();
    const hits = this.raycaster.intersectObjects(activeTargets, false);
    const hit = hits[0];
    const tid = hit && hit.distance < 14 ? (hit.object.userData.tid as string) : null;

    if (tid === this.gazeTid) {
      this.dwell += dt;
    } else {
      this.gazeTid = tid;
      this.dwell = 0;
      this.dwellReacted = false;
    }

    this.updateParents(dt, this.phase === 'ride' || this.phase === 'stop');
    this.updateStrangers();

    const watcher = this.carBuilder.parents.find((p) => p.facing);

    // Visible reactions check
    this.snapCd -= dt;
    if (this.phase === 'ride' || this.phase === 'stop') {
      if (this.snapPeak > this.snapThresh && this.snapArc >= this.snapArcMin && watcher && this.snapCd <= 0) {
        this.addSus(SUS.visible, `Snapped your head around while ${watcher.label} was watching`, watcher);
        this.snapCd = 2.5;
      }
      const real = this.active.find((a) => a.at !== null && a.tids.includes(this.gazeTid || ''));
      if (real && this.dwell > CFG.dwellReact && watcher && !this.dwellReacted) {
        this.addSus(SUS.visible, `Stared at something wrong while ${watcher.label} was watching`, watcher);
        this.dwellReacted = true;
      }
    }

    // Sliding doors interpolation
    this.doorOpen += (this.doorTarget - this.doorOpen) * (1 - Math.exp(-7 * dt));
    this.carBuilder.farLeaves.forEach((l) => {
      l.g.position.x = l.x0 + l.side * 0.62 * this.doorOpen;
    });

    if (this.phase === 'ride' && seg) {
      const L = this.segLen(seg);
      const ts = this.ts;
      const lastChance = L - TD - 4.0;

      // Unobserved anomaly manifestation
      this.active.forEach((a) => {
        if (a.at !== null || ts < a.trigger || ts > lastChance) return;
        if (a.ready && !a.ready()) return;

        let okToSpawn = true;
        if (a.obj) {
          a.obj.getWorldPosition(this.tmpVec1);
          this.tmpVec1.sub(this.camera.position).normalize();
          const ang = this.dirVec.angleTo(this.tmpVec1);
          okToSpawn = ang > (ts > lastChance - 3 ? 0.2 : ts > a.trigger + 8 ? 0.35 : 0.7);
        }

        if (okToSpawn) {
          a.apply();
          a.at = this.GT;
          if (a.id === 'dadanswer') {
            this.setSub(
              `<b>Dad:</b> ${['No, I didn\u2019t hear it either.', 'Because you didn\u2019t ask.', 'Two more. Don\u2019t count them.'][Math.floor(Math.random() * 3)]}`,
              3.4
            );
          }
        }
      });

      // Flags
      if (!this.restraint) this.updateFlag(dt);

      // Mask check dispatch
      (seg._masks || []).forEach((m) => {
        if (!m.done && ts >= m.t) {
          if (this.choice || this.intervening || this.restraint) {
            m.t += 2.0;
            return;
          }
          m.done = true;
          this.startMaskCheck();
        }
      });

      // Safe Haven parent line
      if (seg.type === 'false' && seg.stop === this.misleadStop && !this.misleadUsed && this.tier < 3 && !seg._havenSaid) {
        this.misleadUsed = true;
        seg._mislead = true;
      }
      if ((seg.type === 'haven' || seg._mislead) && !seg._havenSaid) {
        const lead = [6.5, 4.0, 1.6, 0.4][this.tier];
        if (ts >= L - lead) {
          seg._havenSaid = true;
          this.say(
            0,
            this.tier >= 2 ? 'I think this is our\u2026 let\u2019s\u2026 stretch our legs.' : 'I think this is our transfer. Let\u2019s stretch our legs.',
            3.2
          );
        }
      }

      // Wheel curve screech into whisper at Stop 5
      if (!seg._screech && ts >= L - TD + 0.5) {
        seg._screech = true;
        audioEngine.screech(4.4, seg.whisper ? 0.14 : 0.07);
        if (seg.whisper) {
          this.sched(3.6, () => audioEngine.whisper(2.8));
        }
      }

      // Restraint scripted beat at Stop 11 into Greenpoint Av
      if (seg.restraint && !this.restraintDone && !this.restraint && ts > 8.0 && !this.choice && !this.intervening) {
        this.startRestraintMoment();
      }

      // Concerned intervention
      if (this.sus >= SUS.intervene && !this.intervening && !this.choice && !this.restraint) {
        this.triggerConcernedIntervention();
      }

      // Arrival trigger
      if (ts >= L && !this.choice && !this.intervening && !this.restraint && !(seg.restraint && !this.restraintDone)) {
        this.arrive();
      }
    } else {
      this.flagProg = 0;
    }

    if (this.restraint) this.updateRestraint(dt);

    // Audio tracking
    audioEngine.updateTrainSpeed(sf);
    this.clackD -= speed * dt;
    if (this.clackD <= 0) {
      this.clackD += 13.0;
      if (speed > 2.0) audioEngine.clack();
    }
    if (this.tier >= 2) {
      this.whisperT -= dt;
      if (this.whisperT <= 0) {
        this.whisperT = 14 + Math.random() * 12;
        audioEngine.whisper(2.2);
      }
    }
    if (this.tier >= 3) {
      this.heartT -= dt;
      if (this.heartT <= 0) {
        this.heartT = 1.05;
        audioEngine.thump();
      }
    }

    this.applyLighting();
    this.placeWorld(pos, speed);
  }

  private updateFlag(dt: number) {
    if (this.flagHeld && !this.flagLock && this.gazeTid) {
      if (this.flagTid !== this.gazeTid) {
        this.flagTid = this.gazeTid;
        this.flagProg = 0;
      }
      this.flagProg += dt;
      if (this.flagProg >= CFG.flagHold) {
        const live = this.active.find((a) => a.at !== null && a.tids.includes(this.flagTid!));
        const alreadyFlagged = this.segFlags.some((f) => f.tid === this.flagTid && (!live || f.gt >= live.at!));
        if (!alreadyFlagged) {
          this.segFlags.push({ tid: this.flagTid, gt: this.GT });
          // Same sound for every flag, so it never tells the player whether they were right.
          audioEngine.flagRegistered();
        }
        this.flagLock = true;
        this.notedT = this.GT;
        this.notifyUI();
      }
    } else if (!this.flagHeld) {
      this.flagProg = 0;
      this.flagLock = false;
      this.flagTid = null;
    } else if (!this.gazeTid) {
      this.flagProg = 0;
    }
  }

  private updateParents(dt: number, active: boolean) {
    this.carBuilder.parents.forEach((p) => {
      if (p.frozen) {
        p.facing = false;
        return;
      }
      const other = this.carBuilder.parents[1 - (p.i || 0)];
      if (p.force) {
        p.mode = 'player';
      } else if (this.GT >= (p.until || 0)) {
        if (p.mode === 'player') {
          if (this.GT >= (p.holdUntil || 0)) {
            p.mode = Math.random() < 0.6 ? 'phone' : 'other';
            p.until = this.GT + (4 + Math.random() * 5);
          }
        } else if (active && other.mode !== 'player' && Math.random() < 0.6 + 0.1 * this.tier) {
          p.mode = 'player';
          p.until = this.GT + (1.6 + Math.random() * 1.6);
        } else {
          const modes = ['phone', 'phone', 'other', 'down'] as const;
          p.mode = modes[Math.floor(Math.random() * modes.length)];
          p.until = this.GT + (3 + Math.random() * 4) - this.tier * 0.6;
          if (p.mode === 'down') p.downSide = Math.random() < 0.5 ? -1 : 1;
        }
      }

      let ty = 0;
      let tp = 0.55;
      if (p.mode === 'player') {
        [ty, tp] = this.aimLocal(p, this.camera.position);
      } else if (p.mode === 'other') {
        other.head.getWorldPosition(this.tmpVec2);
        [ty, tp] = this.aimLocal(p, this.tmpVec2);
      } else if (p.mode === 'down') {
        this.tmpVec2.set((p.downSide || 1) * 9, 1.3, -0.4);
        [ty, tp] = this.aimLocal(p, this.tmpVec2);
      } else {
        ty = p.i ? -0.12 : 0.12;
        tp = 0.6;
      }

      ty = Math.max(-1.35, Math.min(1.35, ty));
      const k = 1 - Math.exp(-5 * dt);
      p.yaw = (p.yaw || 0) + (ty - (p.yaw || 0)) * k;
      p.pitch = (p.pitch || 0.5) + (tp - (p.pitch || 0.5)) * k;
      p.head.rotation.set(p.pitch, p.yaw, 0);

      if (p.phone) p.phone.visible = p.mode === 'phone';
      const [py, pp] = this.aimLocal(p, this.camera.position);
      p.facing = p.mode === 'player' && Math.abs((p.yaw || 0) - py) < 0.22 && Math.abs((p.pitch || 0) - pp) < 0.25;
    });
  }

  private updateStrangers() {
    const s1 = this.carBuilder.strangers[0];
    if (s1.stare) {
      const [y, p] = this.aimLocal(s1, this.camera.position);
      s1.head.rotation.set(p, Math.max(-1.3, Math.min(1.3, y)), 0);
    }
    const s2 = this.carBuilder.strangers[1];
    if (s2.twist) {
      const [y, p] = this.aimLocal(s2, this.camera.position);
      s2.head.rotation.set(p, y * 1.25, 0.55);
    }
  }

  private aimLocal(person: PersonObject, targetPt: THREE.Vector3): [number, number] {
    person.head.getWorldPosition(this.tmpVec1);
    const dx = targetPt.x - this.tmpVec1.x;
    const dy = targetPt.y - this.tmpVec1.y;
    const dz = targetPt.z - this.tmpVec1.z;
    let yaw = Math.atan2(dx, dz) - person.g.rotation.y;
    yaw = Math.atan2(Math.sin(yaw), Math.cos(yaw));
    const pitch = Math.atan2(-dy, Math.hypot(dx, dz));
    return [yaw, pitch];
  }

  private placeWorld(pos: number, speed: number) {
    const cb = this.carBuilder;
    const L = cb.tunnelLength;
    const best = [1e9, 1e9];

    cb.tunnelItems.forEach((it) => {
      const x = (((it.base - pos) % L) + L) % L - L / 2;
      it.m.position.x = x;
      if (it.light) {
        const si = it.s < 0 ? 0 : 1;
        if (Math.abs(x) < Math.abs(best[si])) best[si] = x;
      }
    });

    let near = false;
    [cb.stA, cb.stB].forEach((s) => {
      if (!s) return;
      const x = s.baseX - pos;
      s.g.position.x = x;
      s.g.visible = Math.abs(x) < 60;
      if (Math.abs(x) < 30) near = true;
    });

    cb.outLights.forEach((l, i) => {
      l.position.x = best[i];
      const f = Math.max(0, Math.min(1, 1 - Math.abs(best[i]) / 3.5));
      l.intensity = cb.worldGroup.visible && !(i === 0 && near) ? 0.9 * f * Math.max(0, Math.min(1, speed / 4.0)) : 0;
    });
  }

  private applyLighting() {
    const cb = this.carBuilder;
    const off = this.GT < this.flickerUntil;
    const k = off ? 0 : this.dim;

    cb.carLights.forEach((l) => (l.intensity = 0.55 * k * (1 - this.tier * 0.08)));
    cb.hemiLight.intensity = off ? 0.05 : 0.65 * (0.55 + 0.45 * k) * (1 - this.tier * 0.07);
    cb.lightSegs.forEach((l) => (l.m.visible = !off));
  }

  // Kinematic helpers
  public segLen(s: SegmentDef): number {
    return TA + (s.cruise || 26) + TD;
  }

  public segDist(s: SegmentDef): number {
    return V * (TA / 2 + (s.cruise || 26) + TD / 2);
  }

  private segVel(s: SegmentDef, t: number): number {
    const C = s.cruise || 26;
    if (t < TA) return V * this.smooth(t / TA);
    if (t < TA + C) return V;
    if (t < TA + C + TD) return V * (1 - this.smooth((t - TA - C) / TD));
    return 0;
  }

  private segPos(s: SegmentDef, t: number): number {
    const C = s.cruise || 26;
    if (t <= TA) {
      const u = t / TA;
      return V * TA * (u * u * u - (u * u * u * u) / 2);
    }
    let p = (V * TA) / 2;
    if (t <= TA + C) return p + V * (t - TA);
    p += V * C;
    const u = Math.min(1, (t - TA - C) / TD);
    return p + V * TD * (u - (u * u * u - (u * u * u * u) / 2));
  }

  private smooth(x: number): number {
    x = Math.max(0, Math.min(1, x));
    return x * x * (3 - 2 * x);
  }
}
