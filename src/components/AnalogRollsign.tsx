/**
 * Mechanical Transit Analog Rollsign
 * Renders chapter transition placards styled after classic NYC subway roller curtains.
 */
import React from 'react';
import { GameEngine } from '../game/gameState';
import { routeManager } from '../game/routeManager';

interface AnalogRollsignProps {
  engine: GameEngine;
}

export const AnalogRollsign: React.FC<AnalogRollsignProps> = ({ engine }) => {
  const sign = engine.chapterRollsign;
  // If prompt/choice is open, hide the sign
  if (!sign || engine.choice) return null;

  const currentRoute = routeManager.activeRoute;

  return (
    <div
      data-testid="chapter-rollsign"
      className="absolute left-1/2 top-20 -translate-x-1/2 pointer-events-none z-30 flex flex-col items-center animate-in fade-in slide-in-from-top-4 duration-500"
    >
      <div className="bg-[#121212] text-[#ece6d3] border-2 border-[#333333] px-6 py-3 rounded shadow-2xl flex flex-col items-center max-w-md text-center">
        <div className="flex items-center gap-2 mb-1">
          <span
            className="w-5 h-5 rounded-full font-black text-xs inline-flex items-center justify-center"
            style={{
              backgroundColor: currentRoute.bulletColor,
              color: currentRoute.bulletTextColor,
            }}
          >
            {currentRoute.id}
          </span>
          <span className="font-mono text-xs font-bold tracking-widest text-[#9a9684]">
            {sign.chapter.numeral}
          </span>
        </div>
        <h3 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-[#f4eedb]">
          {sign.title}
        </h3>
        <p className="text-xs font-mono text-[#8a8674] mt-0.5">
          {sign.subtitle}
        </p>
      </div>
    </div>
  );
};
