/**
 * Pause Screen Overlay for Court Sq-Bound
 */
import React from 'react';
import { Play, RotateCcw } from 'lucide-react';
import { STOPS } from '../constants';
import { GameEngine } from '../game/gameState';

interface PauseScreenProps {
  engine: GameEngine;
  onResume: () => void;
  onRestart: () => void;
}

export const PauseScreen: React.FC<PauseScreenProps> = ({ engine, onResume, onRestart }) => {
  const nextStop = engine.seg ? STOPS[engine.seg.stop] : STOPS[2];
  // Restarting throws away the current ride, so it takes a second, explicit click.
  const [confirmRestart, setConfirmRestart] = React.useState(false);

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="w-full max-w-sm p-6 rounded bg-[#101411] border border-white/15 text-center shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        <h2 className="text-2xl font-black text-[#ece6d3] uppercase tracking-wide">Train Paused</h2>
        <p className="mt-2 text-sm text-[#9a9684]">
          Next approaching station: <span className="text-[#ece6d3] font-bold">{nextStop}</span>
        </p>

        <div className="mt-6 flex flex-col gap-2.5">
          <button
            onClick={onResume}
            className="w-full py-3 px-6 rounded bg-[#6cbe45] hover:bg-[#7ad150] text-[#0f1a0b] font-extrabold text-base tracking-wide transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2"
          >
            <Play className="w-4 h-4 fill-current" />
            Resume Ride
          </button>

          {!confirmRestart ? (
            <button
              onClick={() => setConfirmRestart(true)}
              className="w-full py-3 px-6 rounded border border-white/20 hover:border-white/40 bg-transparent text-[#ece6d3] font-bold text-base tracking-wide transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              Restart Ride
            </button>
          ) : (
            <div
              role="alertdialog"
              aria-labelledby="restart-confirm-text"
              className="w-full p-3 rounded border border-[#e3a83a]/40 bg-[#e3a83a]/10 text-left"
            >
              <p id="restart-confirm-text" className="text-sm text-[#ece6d3] leading-snug">
                Start over from {STOPS[1]}? This ride won't be saved to your history.
              </p>
              <div className="mt-3 flex gap-2">
                <button
                  autoFocus
                  onClick={onRestart}
                  className="flex-1 py-2.5 px-4 rounded bg-[#e3a83a] hover:bg-[#f0b84a] text-[#1a1205] font-extrabold text-sm transition-all active:scale-95"
                >
                  Restart
                </button>
                <button
                  onClick={() => setConfirmRestart(false)}
                  className="flex-1 py-2.5 px-4 rounded border border-white/20 hover:border-white/40 text-[#ece6d3] font-bold text-sm transition-all active:scale-95"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
