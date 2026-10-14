/**
 * Core type definitions for Court Sq-Bound: NYC Subway Liminal Horror
 * Based on Master Project Document v5.1
 */
import * as THREE from 'three';

export type GamePhase = 'menu' | 'intro' | 'ride' | 'stop' | 'haven' | 'trial' | 'end';

export interface SegmentDef {
  stop: number;
  b?: boolean;
  anoms: number;
  forced?: string[];
  type?: 'real' | 'false' | 'haven';
  tick?: 'doors' | 'flicker';
  forgiving?: boolean;
  mask?: number[];
  crowd?: boolean;
  chat?: number;
  whisper?: boolean;
  thin?: boolean;
  silent?: boolean;
  restraint?: boolean;
  bait?: boolean;
  paLie?: string;
  final?: boolean;
  cruise?: number;
  _masks?: Array<{ t: number; done: boolean }>;
  _havenSaid?: boolean;
  _screech?: boolean;
  _mislead?: boolean;
}

export interface ChoiceItem {
  txt: string;
  val: any;
}

export interface ChoiceState {
  items: ChoiceItem[];
  window: number;
  left: number;
  glitch: number;
  reshuffle?: boolean;
  reshuffled?: boolean;
  gT: number;
  keyMap: number[];
  onPick: (val: any, rt: number) => void;
}

export interface AnomalyDef {
  tier: number;
  make: () => {
    tids: string[];
    obj: THREE.Object3D | null;
    desc: string;
    apply: () => void;
    revert: () => void;
    ready?: () => boolean;
  } | null;
}

export interface ActiveAnomaly {
  id: string;
  tier: number;
  tids: string[];
  obj: THREE.Object3D | null;
  desc: string;
  trigger: number;
  at: number | null;
  apply: () => void;
  revert: () => void;
  ready?: () => boolean;
}

export interface StopAnomalyRecord {
  desc: string;
  hit: boolean;
}

export interface StopLogRecord {
  stop: number;
  b: boolean;
  name: string;
  type?: 'real' | 'haven' | 'false' | string;
  tick?: 'doors' | 'flicker' | null;
  mislead?: boolean;
  bait?: boolean;
  paLie?: boolean;
  doors?: 'stay' | 'off' | null;
  correct?: boolean;
  anoms: StopAnomalyRecord[];
  fps: string[];
  san?: number;
  lo?: number;
  hi?: number;
}

export interface SusLogEntry {
  t: number;
  n: number;
  reason: string;
  stop: number;
}

export interface SanLogEntry {
  t: number;
  d: number;
  raw: number;
  reason: string;
}

export interface SanSample {
  stop: number;
  san: number;
  lo: number;
  hi: number;
  pos: number;
}

export interface RestraintState {
  t: number;
  started: boolean;
  wait: number;
  dur: number;
  failed: boolean;
  beats: number;
  grace: number;
}

export interface TrialEvent {
  at: number;
  i: number;
  kind: 'flick' | 'open' | 'close';
  done?: boolean;
}

export interface TrialState {
  depth: number;
  need: number;
  mode: 'paths' | 'board';
  cyc: number;
  correct: number;
  events: TrialEvent[];
  picks: Array<{ mode: string; ok: boolean }>;
  stopName: string;
  stepT: number;
}

export interface TrialRecord {
  stop: number;
  depth: number;
  clean: boolean;
}

export interface RunHistoryRecord {
  date: number;
  san: number;
  sanPct: number;
  peak: number;
  acc: { correct: number; miss: number; fp: number };
  trials: number;
}

export interface PersonObject {
  g: THREE.Group;
  head: THREE.Group;
  phone: THREE.Object3D | null;
  eyes: THREE.Mesh[];
  skMat: THREE.Material;
  skin: number;
  tid: string;
  label: string;
  home: THREE.Vector3;
  pose: [number, number];
  mode?: 'phone' | 'other' | 'player' | 'down';
  until?: number;
  holdUntil?: number;
  force?: boolean;
  frozen?: boolean;
  yaw?: number;
  pitch?: number;
  facing?: boolean;
  i?: number;
  downSide?: number;
  stare?: boolean;
  twist?: boolean;
}
