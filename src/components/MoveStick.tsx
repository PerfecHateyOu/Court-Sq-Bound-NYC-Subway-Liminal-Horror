/**
 * On-Screen Virtual Joystick for Touch Device Movement
 * Emits normalized fwd and right movement vectors to the GameEngine.
 */
import React, { useRef, useState, useCallback } from 'react';
import { GameEngine } from '../game/gameState';

interface MoveStickProps {
  engine: GameEngine;
}

export const MoveStick: React.FC<MoveStickProps> = ({ engine }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(false);
  const [knobPos, setKnobPos] = useState({ x: 0, y: 0 });

  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    setActive(true);
    handlePointerMove(e);
  };

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!active || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const radius = rect.width / 2;

      const dx = e.clientX - cx;
      const dy = e.clientY - cy;
      const dist = Math.hypot(dx, dy);
      const angle = Math.atan2(dy, dx);

      const clampedDist = Math.min(dist, radius);
      const kx = Math.cos(angle) * clampedDist;
      const ky = Math.sin(angle) * clampedDist;
      setKnobPos({ x: kx, y: ky });

      // Normalized input: forward is -ky / radius, right is kx / radius
      const fwd = -ky / radius;
      const right = kx / radius;
      engine.setMoveInput(fwd, right);
    },
    [active, engine]
  );

  const handlePointerUp = useCallback(() => {
    setActive(false);
    setKnobPos({ x: 0, y: 0 });
    engine.setMoveInput(0, 0);
  }, [engine]);

  return (
    <div
      ref={containerRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      className="absolute left-6 bottom-6 w-24 h-24 rounded-full bg-black/50 border border-white/20 touch-none pointer-events-auto flex items-center justify-center select-none"
    >
      <div
        className="w-10 h-10 rounded-full bg-[#6cbe45]/60 border border-[#6cbe45] transition-transform duration-75"
        style={{
          transform: `translate(${knobPos.x}px, ${knobPos.y}px)`,
        }}
      />
    </div>
  );
};
