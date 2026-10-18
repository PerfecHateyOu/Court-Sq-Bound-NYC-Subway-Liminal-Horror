/**
 * Microcassette EVP Audio Recorder Handheld Interface
 * Displays analog frequency tuning dial, signal VU meter, fast-step nudge buttons,
 * and magnetic tape recording controls.
 */
import React from 'react';
import { GameEngine } from '../game/gameState';
import { evp, EVP_MIN_KHZ, EVP_MAX_KHZ, EVP_RECORD_HOLD } from '../game/evpManager';
import { ChevronLeft, ChevronRight, Mic, Disc3 } from 'lucide-react';

interface EvpRecorderProps {
  engine: GameEngine;
}

export const EvpRecorder: React.FC<EvpRecorderProps> = ({ engine }) => {
  const isLocked = !!evp.locked;
  const meterVal = Math.max(0, Math.min(1, evp.meter));
  const recProgress = Math.min(1, evp.recordT / EVP_RECORD_HOLD);

  return (
    <div className="absolute right-4 bottom-5 pointer-events-auto z-30 select-none animate-in fade-in slide-in-from-bottom-2 duration-200">
      <div className="w-64 sm:w-72 bg-[#2c2621] text-[#ece6d3] border-2 border-[#5c4e43] rounded-md p-3 shadow-2xl flex flex-col gap-2 font-mono">
        {/* Top Header & Tape Counter */}
        <div className="flex items-center justify-between border-b border-[#4d4239] pb-1.5 text-xs">
          <div className="flex items-center gap-1.5">
            <Disc3 className={`w-4 h-4 text-[#e3a83a] ${evp.recording ? 'animate-spin' : ''}`} />
            <span className="font-bold tracking-wider text-[11px] text-[#cfc5b0]">EVP RECORDER</span>
          </div>
          <span className="text-[10px] text-[#8c7e70] bg-black/40 px-1.5 py-0.5 rounded">
            TAPES: {evp.tapes.length}
          </span>
        </div>

        {/* Frequency LCD & Lock Meter */}
        <div className="bg-[#12100d] border border-[#443a32] p-2 rounded flex flex-col gap-1.5">
          <div className="flex items-baseline justify-between">
            <span className="text-[10px] text-[#8c7e70]">FREQUENCY</span>
            <span className="text-xl font-black text-[#5df264] tracking-wider">
              {evp.khz.toFixed(1)} <span className="text-xs text-[#3b9e40]">kHz</span>
            </span>
          </div>

          {/* VU / Carrier Signal Meter */}
          <div className="flex items-center gap-2">
            <span className="text-[9px] text-[#8c7e70]">SIGNAL</span>
            <div className="flex-1 h-2 bg-[#221d18] rounded-full overflow-hidden p-0.5 flex gap-0.5">
              {[0.15, 0.35, 0.55, 0.75, 0.95].map((thresh, idx) => (
                <div
                  key={idx}
                  className={`flex-1 rounded-sm transition-opacity duration-75 ${
                    meterVal >= thresh
                      ? idx >= 3
                        ? 'bg-amber-500 opacity-100'
                        : 'bg-[#5df264] opacity-100'
                      : 'bg-white/10 opacity-30'
                  }`}
                />
              ))}
            </div>
            {isLocked && (
              <span className="text-[9px] font-bold px-1 rounded bg-[#5df264]/20 text-[#5df264] animate-pulse">
                LOCK
              </span>
            )}
          </div>
        </div>

        {/* Tuning Controls */}
        <div className="flex items-center gap-1">
          <button
            aria-label="Tune down 5 kHz"
            onClick={() => evp.tune(-5.0)}
            className="px-1.5 py-1.5 rounded bg-[#3d342d] hover:bg-[#4d4239] text-[10px] font-bold text-[#cfc5b0] active:scale-95 transition-all"
          >
            -5k
          </button>
          <button
            aria-label="Tune down"
            onClick={() => evp.tune(-0.5)}
            className="flex-1 py-1.5 flex items-center justify-center rounded bg-[#3d342d] hover:bg-[#4d4239] text-xs text-[#cfc5b0] active:scale-95 transition-all"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          {/* Draggable Tuning Slider */}
          <input
            type="range"
            min={EVP_MIN_KHZ}
            max={EVP_MAX_KHZ}
            step={0.5}
            value={evp.khz}
            onChange={(e) => evp.setKhz(parseFloat(e.target.value))}
            className="w-24 accent-[#5df264] cursor-pointer"
          />

          <button
            aria-label="Tune up"
            onClick={() => evp.tune(0.5)}
            className="flex-1 py-1.5 flex items-center justify-center rounded bg-[#3d342d] hover:bg-[#4d4239] text-xs text-[#cfc5b0] active:scale-95 transition-all"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <button
            aria-label="Tune up 5 kHz"
            onClick={() => evp.tune(5.0)}
            className="px-1.5 py-1.5 rounded bg-[#3d342d] hover:bg-[#4d4239] text-[10px] font-bold text-[#cfc5b0] active:scale-95 transition-all"
          >
            +5k
          </button>
        </div>

        {/* Record Button & Lower Button */}
        <div className="flex items-center gap-2 pt-1 border-t border-[#4d4239]">
          <button
            onPointerDown={() => evp.setRecording(true)}
            onPointerUp={() => evp.setRecording(false)}
            onPointerCancel={() => evp.setRecording(false)}
            className={`flex-1 py-2 rounded flex items-center justify-center gap-1.5 text-xs font-bold transition-all active:scale-95 relative overflow-hidden ${
              evp.recording
                ? 'bg-red-700 text-white'
                : 'bg-red-950/80 hover:bg-red-900/90 text-red-200 border border-red-700/50'
            }`}
          >
            {evp.recording && (
              <div
                className="absolute inset-y-0 left-0 bg-red-600/50 transition-all"
                style={{ width: `${recProgress * 100}%` }}
              />
            )}
            <Mic className="w-3.5 h-3.5 relative z-10" />
            <span className="relative z-10">
              {evp.recording ? 'RECORDING…' : 'HOLD TO RECORD'}
            </span>
          </button>

          <button
            onClick={() => engine.toggleRecorder()}
            className="px-3 py-2 rounded bg-black/40 hover:bg-black/60 text-[11px] text-[#8c7e70] active:scale-95 transition-all"
          >
            LOWER [R]
          </button>
        </div>
      </div>
    </div>
  );
};
