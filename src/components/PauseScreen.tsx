/**
 * Pause Screen Overlay for Court Sq-Bound
 */
import React from 'react';
import { Play } from 'lucide-react';
import { STOPS } from '../constants';
import { GameEngine } from '../game/gameState';

interface PauseScreenProps {
  engine: GameEngine;
  onResume: () => void;
}

export const PauseScreen: React.FC<PauseScreenProps> = ({ engine, onResume }) => {
  const nextStop = engine.seg ? STOPS[engine.seg.stop] : STOPS[2];

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="w-full max-w-sm p-6 rounded bg-[#101411] border border-white/15 text-center shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        <h2 className="text-2xl font-black text-[#ece6d3] uppercase tracking-wide">Train Paused</h2>
        <p className="mt-2 text-sm text-[#9a9684]">
          Next approaching station: <span className="text-[#ece6d3] font-bold">{nextStop}</span>
        </p>

        <div className="mt-6 flex justify-center">
          <button
            onClick={onResume}
            className="w-full py-3 px-6 rounded bg-[#6cbe45] hover:bg-[#7ad150] text-[#0f1a0b] font-extrabold text-base tracking-wide transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2"
          >
            <Play className="w-4 h-4 fill-current" />
            Resume Ride
          </button>
        </div>
      </div>
    </div>
  );
};
