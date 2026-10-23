/**
 * On-screen thumbstick for walking on touch devices (WASD is the keyboard equivalent).
 *
 * Analog: the further the knob is pushed, the faster you walk. It sits in its own corner,
 * outside the 3D view, so one thumb can walk while the other drags the view to look.
 * Unmounting (pause, prompts, the restraint) stops walking.
 */
import React, { useEffect, useRef, useState } from 'react';
import { GameEngine } from '../game/gameState';

const BASE = 112; // px, base diameter
const TRAVEL = 40; // px, how far the knob moves from centre at full speed
const DEADZONE = 0.18; // fraction of travel ignored, so a resting thumb doesn't creep

export const MoveStick: React.FC<{ engine: GameEngine }> = ({ engine }) => {
  const baseRef = useRef<HTMLDivElement>(null);
  const pointerRef = useRef<number | null>(null);
  const [knob, setKnob] = useState({ x: 0, y: 0 });

  const stop = () => {
    if (pointerRef.current === null) return;
    pointerRef.current = null;
    setKnob({ x: 0, y: 0 });
    engine.setMoveInput(0, 0);
  };

  const track = (clientX: number, clientY: number) => {
    const el = baseRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    let dx = clientX - (r.left + r.width / 2);
    let dy = clientY - (r.top + r.height / 2);
    const len = Math.hypot(dx, dy);
    if (len > TRAVEL) {
      dx = (dx / len) * TRAVEL;
      dy = (dy / len) * TRAVEL;
    }
    setKnob({ x: dx, y: dy });
    // Rescale past the deadzone so walking starts smoothly from zero.
    const mag = Math.min(1, len / TRAVEL);
    const k = mag <= DEADZONE ? 0 : (mag - DEADZONE) / (1 - DEADZONE) / (mag || 1);
    engine.setMoveInput((-dy / TRAVEL) * k, (dx / TRAVEL) * k);
  };

  const active = pointerRef.current !== null;

  // Hidden (pause, prompt, restraint) while a thumb is down: stop walking.
  useEffect(() => stop, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div
      ref={baseRef}
      data-testid="move-stick"
      role="group"
      aria-label="Walk: drag the stick"
      className={`absolute left-4 bottom-5 rounded-full border bg-black/45 pointer-events-auto touch-none select-none transition-colors calm:transition-none ${active ? 'border-white/40' : 'border-white/20'}`}
      style={{ width: BASE, height: BASE }}
      onPointerDown={(e) => {
        e.preventDefault();
        if (pointerRef.current !== null) return;
        pointerRef.current = e.pointerId;
        try {
          e.currentTarget.setPointerCapture(e.pointerId);
        } catch {
          /* synthetic or already-ended pointer: tracking still works while over the stick */
        }
        track(e.clientX, e.clientY);
      }}
      onPointerMove={(e) => {
        if (e.pointerId === pointerRef.current) track(e.clientX, e.clientY);
      }}
      onPointerUp={(e) => {
        if (e.pointerId === pointerRef.current) stop();
      }}
      onPointerCancel={(e) => {
        if (e.pointerId === pointerRef.current) stop();
      }}
      onLostPointerCapture={(e) => {
        if (e.pointerId === pointerRef.current) stop();
      }}
      onContextMenu={(e) => e.preventDefault()}
    >
      <span className={`absolute inset-x-0 top-2 text-center text-4xs font-bold tracking-[0.2em] transition-colors ${active ? 'text-cream' : 'text-dim'}`}>
        WALK
      </span>
      {/* How far the knob travels: faint at rest, brighter under a thumb */}
      <span
        aria-hidden="true"
        className={`absolute left-1/2 top-1/2 rounded-full border transition-colors calm:transition-none ${active ? 'border-g-line/60' : 'border-white/12'}`}
        style={{ width: TRAVEL * 2 + 8, height: TRAVEL * 2 + 8, marginLeft: -(TRAVEL + 4), marginTop: -(TRAVEL + 4) }}
      />
      {/* Follows the thumb exactly; springs back to the middle with a short ease when let go */}
      <div
        className={`absolute left-1/2 top-1/2 w-12 h-12 -ml-6 -mt-6 rounded-full border shadow-lg ${
          active ? 'bg-g-line/35 border-g-line' : 'bg-cream/15 border-white/40 transition-transform duration-150 ease-out calm:transition-none'
        }`}
        style={{ transform: `translate(${knob.x}px, ${knob.y}px)` }}
      />
    </div>
  );
};
