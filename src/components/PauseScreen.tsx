/**
 * Pause Menu Screen
 * Ambient transit audio pause screen with resume, restart, and settings navigation.
 */
import React from 'react';
import { GameEngine } from '../game/gameState';
import { Play, RotateCcw, Settings, Home } from 'lucide-react';

interface PauseScreenProps {
  engine: GameEngine;
  onResume: () => void;
  onRestart: () => void;
  onOpenSettings: () => void;
}

export const PauseScreen: React.FC<PauseScreenProps> = ({
  onResume,
  onRestart,
  onOpenSettings,
}) => {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md select-none"
    >
      <div className="w-full max-w-sm bg-[#18191a] text-[#ece6d3] border border-white/20 rounded-md p-6 shadow-2xl flex flex-col items-center gap-4 text-center">
        <div className="inline-block px-2.5 py-0.5 rounded bg-white/10 text-[10px] font-mono tracking-widest text-[#9a9684]">
          TRANSIT PAUSED
        </div>

        <h2 className="text-2xl font-black uppercase tracking-tight text-white">
          Commute Interrupted
        </h2>

        <p className="text-xs text-[#9a9684] leading-relaxed">
          The train has halted between signal blocks. Press [P] or click Resume to proceed.
        </p>

        <div className="w-full flex flex-col gap-2.5 mt-2">
          <button
            onClick={onResume}
            className="w-full py-3 rounded-full bg-[#6cbe45] hover:bg-[#5daf38] text-[#1b1d18] font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>RESUME RIDE</span>
          </button>

          <button
            onClick={onRestart}
            className="w-full py-2.5 rounded-full bg-white/10 hover:bg-white/15 text-white font-semibold text-xs flex items-center justify-center gap-2 transition-all active:scale-95"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>RESTART COMMUTE</span>
          </button>

          <button
            onClick={onOpenSettings}
            className="w-full py-2.5 rounded-full bg-white/10 hover:bg-white/15 text-white font-semibold text-xs flex items-center justify-center gap-2 transition-all active:scale-95"
          >
            <Settings className="w-3.5 h-3.5" />
            <span>SETTINGS</span>
          </button>
        </div>
      </div>
    </div>
  );
};
