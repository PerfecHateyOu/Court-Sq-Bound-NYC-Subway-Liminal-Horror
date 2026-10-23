/**
 * The game's controls, written once. The title's Controls block, the practice coach and the HUD's
 * key-hint strip all read from here, each showing only the current input method (keyboard and
 * mouse, or touch). Change a binding in App.tsx's key handler, then change it here.
 */
export type InputKind = 'keyboard' | 'touch';

interface Binding {
  /** What it does, as a short label ("Flag", "Walk between cars"). */
  action: string;
  /** A one-word label for the hint strip, when `action` is longer. */
  short?: string;
  /** How to do it with a keyboard and mouse ("Hold F"). */
  keyboard: string;
  /** The key cap(s) for the HUD hint strip, if it has one ("F", "WASD"). */
  key?: string;
  /** How to do it on a touch screen ("Hold the FLAG button"). */
  touch: string;
}

export const CONTROLS = {
  look: { action: 'Look', keyboard: 'Click in the train, then move the mouse (or use the arrow keys)', touch: 'Drag the screen' },
  flag: { action: 'Flag', keyboard: 'Hold F', key: 'F', touch: 'Hold the FLAG button' },
  answer: { action: 'Answer', keyboard: '1, 2 or 3', touch: 'Tap a choice' },
  steady: { action: 'Hold steady', keyboard: 'Hold Space when told to', touch: 'Hold the button when told to' },
  camera: { action: 'Camera', keyboard: 'C', key: 'C', touch: 'Camera button' },
  evidence: { action: 'Evidence log', short: 'Evidence', keyboard: 'Tab', key: 'TAB', touch: 'Evidence button' },
  walk: { action: 'Walk between cars', short: 'Walk', keyboard: 'WASD', key: 'WASD', touch: 'WALK stick, bottom left' },
  pause: { action: 'Pause', keyboard: 'Esc or P', touch: 'Pause button' },
  mute: { action: 'Mute', keyboard: 'M', touch: 'Sound button' },
} satisfies Record<string, Binding>;

export type ControlId = keyof typeof CONTROLS;

/** How to do `id` with this input ("Hold F" / "Hold the FLAG button"). */
export const how = (id: ControlId, input: InputKind): string => CONTROLS[id][input];

/** The title's Controls block, in reading order. */
export const BRIEFING_CONTROLS: ControlId[] = ['look', 'flag', 'answer', 'steady', 'camera', 'evidence', 'walk', 'pause', 'mute'];

/** The HUD's key-hint strip (keyboard only; touch has labelled buttons). */
export const HINT_STRIP: ControlId[] = ['flag', 'camera', 'evidence', 'walk'];

/** "[F] FLAG" style entries for the hint strip. */
export const hintStrip = () =>
  HINT_STRIP.map((id) => {
    const c: Binding = CONTROLS[id];
    return { id, key: c.key ?? c.keyboard, label: (c.short ?? c.action).toUpperCase() };
  });
