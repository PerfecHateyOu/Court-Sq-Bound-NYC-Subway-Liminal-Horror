/**
 * Post-Ride Travel Report & Psychological Assessment Screen
 * Summarizes reached escape ending, accuracy score, sanity preservation,
 * developed Polaroid prints, and earned badges.
 */
import React, { useState } from 'react';
import { GameEngine } from '../game/gameState';
import { RunHistoryRecord } from '../types';
import { ENDINGS, resolveEnding } from '../game/endings';
import { RotateCcw, FolderLock, Award, ShieldCheck, Camera } from 'lucide-react';
import { CaseFilesModal } from './CaseFilesModal';
import { polaroidManager } from '../game/polaroidManager';

interface ReportScreenProps {
  engine: GameEngine;
  runs: RunHistoryRecord[];
  onPlayAgain: () => void;
}

export const ReportScreen: React.FC<ReportScreenProps> = ({
  engine,
  runs,
  onPlayAgain,
}) => {
  const [caseFilesOpen, setCaseFilesOpen] = useState(false);

  // Compute or read reached ending
  const lastEndingId = runs[0]?.endingId || 'civilian_extraction';
  const endingDef = ENDINGS[lastEndingId] || ENDINGS['civilian_extraction'];

  const photos = polaroidManager.photos || [];

  return (
    <div className="fixed inset-0 z-40 flex flex-col items-center justify-between p-4 sm:p-8 bg-[#121312] text-[#ece6d3] overflow-y-auto select-none">
      {/* Header Plaque */}
      <div className="w-full max-w-2xl flex flex-col items-center text-center mt-2 sm:mt-6">
        <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded bg-black/60 border border-white/10 text-[11px] font-mono text-[#9a9684] uppercase tracking-widest mb-2">
          NYCT DEPARTMENT OF PSYCHOLOGICAL TRANSIT // EXIT REPORT
        </div>
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-black uppercase tracking-tight text-white mb-2">
          {endingDef.title}
        </h1>
        <p className="text-xs sm:text-sm text-[#9a9684] max-w-md leading-relaxed">
          {endingDef.summary}
        </p>
      </div>

      {/* Main Dossier Grid */}
      <div className="w-full max-w-2xl bg-[#1b1c1b] border border-white/15 rounded-md p-5 sm:p-6 shadow-2xl flex flex-col gap-5 my-4">
        {/* Core Metrics */}
        <div className="grid grid-cols-3 gap-3 text-center border-b border-white/10 pb-4">
          <div className="flex flex-col items-center">
            <span className="text-[10px] font-mono text-[#9a9684]">FINAL SANITY</span>
            <span className="text-xl sm:text-2xl font-black text-[#6cbe45]">
              {Math.round(engine.san)}%
            </span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-[10px] font-mono text-[#9a9684]">PEAK SUSPICION</span>
            <span className="text-xl sm:text-2xl font-black text-[#e3a83a]">
              {engine.peak}
            </span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-[10px] font-mono text-[#9a9684]">STOPS REACHED</span>
            <span className="text-xl sm:text-2xl font-black text-white">
              {engine.seg ? engine.seg.stop : 13}/13
            </span>
          </div>
        </div>

        {/* Narrative Narrative Epilogue */}
        <div className="bg-black/40 border border-white/5 p-4 rounded text-xs sm:text-sm text-[#d4cebd] leading-relaxed font-serif italic">
          “{endingDef.lore}”
        </div>

        {/* Developed Polaroid Prints */}
        {photos.length > 0 && (
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs font-bold text-white">
              <span className="flex items-center gap-1.5">
                <Camera className="w-4 h-4 text-[#e3a83a]" />
                Developed Silver Prints
              </span>
              <span className="font-mono text-[#9a9684] text-[10px]">
                {photos.length} DEVELOPED
              </span>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {photos.slice(0, 4).map((p) => (
                <div key={p.id} className="aspect-square bg-black rounded overflow-hidden border border-white/20">
                  {p.dataUrl && (
                    <img
                      src={p.dataUrl}
                      alt="Developed polaroid"
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Action Navigation */}
      <div className="w-full max-w-2xl flex flex-col sm:flex-row items-center gap-3 mb-4">
        <button
          onClick={onPlayAgain}
          className="w-full sm:flex-1 py-3.5 rounded-full bg-[#6cbe45] hover:bg-[#5daf38] text-[#1b1d18] font-black text-sm tracking-wide flex items-center justify-center gap-2 transition-all active:scale-95 shadow-xl"
        >
          <RotateCcw className="w-4 h-4" />
          <span>BOARD NEXT COMMUTE</span>
        </button>

        <button
          onClick={() => setCaseFilesOpen(true)}
          className="w-full sm:flex-1 py-3.5 rounded-full bg-black/60 hover:bg-black/80 border border-white/20 text-white font-bold text-sm tracking-wide flex items-center justify-center gap-2 transition-all active:scale-95"
        >
          <FolderLock className="w-4 h-4 text-[#e3a83a]" />
          <span>INSPECT CASE FILES</span>
        </button>
      </div>

      {/* Case Files Modal */}
      {caseFilesOpen && (
        <CaseFilesModal
          engine={engine}
          onClose={() => setCaseFilesOpen(false)}
        />
      )}
    </div>
  );
};
