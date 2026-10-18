/**
 * Analog Transit Rollsign (Operation Skyward Phase 3)
 *
 * Vintage MTA NYCT mechanical flip-rollsign display that announces chapter transitions
 * between stops. Styled with authentic enamel split-flap typography, metallic rivets,
 * subtle scanlines, and reduced-motion accessibility.
 */
import React from 'react';
import { GameEngine } from '../game/gameState';
import { settings, useSettings } from '../settings';
import { routeManager } from '../game/routeManager';

interface AnalogRollsignProps {
  engine: GameEngine;
}

export const AnalogRollsign: React.FC<AnalogRollsignProps> = ({ engine }) => {
  const G = engine;
  useSettings(); // re-render when screenEffects toggle changes

  const rollsign = G.chapterRollsign;
  // Never on top of a prompt: choices and the restraint own the screen.
  if (!rollsign || G.choice || G.restraint) return null;

  const { chapter, title, subtitle } = rollsign;
  const route = routeManager.activeRoute;
  const isReduced = settings.effectsReduced();

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={`${chapter.numeral}: ${title} — ${subtitle}`}
      data-testid="chapter-rollsign"
      data-chapter={chapter.index}
      className={`fixed left-1/2 top-[120px] sm:top-20 -translate-x-1/2 z-40 pointer-events-none transition-all duration-500 ease-out ${
        isReduced ? 'opacity-100' : 'animate-in fade-in slide-in-from-top-6 duration-300'
      }`}
    >
      {/* Heavy enamel metal housing with authentic rivets */}
      <div className="relative overflow-hidden px-5 py-3 sm:px-7 sm:py-3.5 rounded-sm bg-[#121411] border-2 border-[#8e8773] shadow-[0_12px_36px_rgba(0,0,0,0.85)] max-w-[min(94vw,560px)] text-center">
        {/* Subtle scanline and enamel sheen */}
        <div className="absolute inset-0 pointer-events-none transit-sign-raster opacity-25" />
        <div className="absolute top-0 inset-x-0 h-[2px] bg-white/20" />
        <div className="absolute bottom-0 inset-x-0 h-[1px] bg-black/80" />

        {/* Screw corner rivets */}
        <span className="absolute top-1 left-1.5 w-1.5 h-1.5 rounded-full bg-[#5f5a4e] border border-[#2b271f]" />
        <span className="absolute top-1 right-1.5 w-1.5 h-1.5 rounded-full bg-[#5f5a4e] border border-[#2b271f]" />
        <span className="absolute bottom-1 left-1.5 w-1.5 h-1.5 rounded-full bg-[#5f5a4e] border border-[#2b271f]" />
        <span className="absolute bottom-1 right-1.5 w-1.5 h-1.5 rounded-full bg-[#5f5a4e] border border-[#2b271f]" />

        {/* Division Header */}
        <div className="flex items-center justify-center gap-2 mb-1">
          <span
            className="w-3.5 h-3.5 rounded-full inline-flex items-center justify-center text-[8px] font-black"
            style={{ background: route.bulletColor, color: route.bulletTextColor }}
          >
            {route.id}
          </span>
          <span className="font-mono text-[9px] sm:text-[10px] tracking-[0.25em] text-[#9f9883] uppercase font-bold">
            MTA NYCT • SYSTEM DIVISION
          </span>
          <span className="w-1.5 h-1.5 rounded-full bg-[#e3a83a]" />
        </div>

        {/* Mechanical Split-Card Body */}
        <div className={`relative z-10 py-0.5 ${!isReduced ? 'transit-sign-flicker-subtle' : ''}`}>
          <div className="font-mono font-black text-xs sm:text-sm tracking-[0.2em] text-[#e3a83a] uppercase mb-0.5">
            {chapter.numeral}
          </div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight text-[#f3ede0] uppercase font-sans leading-none drop-shadow-sm">
            {title}
          </h2>
          <div className="mt-1 pt-1 border-t border-[#3a372f] text-[10px] sm:text-[11px] font-medium text-[#c4bda7] tracking-wider uppercase font-mono">
            {subtitle}
          </div>
        </div>
      </div>
    </div>
  );
};
