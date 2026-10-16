/**
 * Vintage Polaroid 600 Camera Viewfinder & Chemical Film Development Overlay
 * Displays authentic vintage camera HUD with viewfinder framing, exposure meter,
 * film cartridge counter, high-voltage flash burst flare, and chemical print development.
 */
import React from 'react';
import { GameEngine } from '../game/gameState';
import { polaroidManager } from '../game/polaroidManager';
import { Camera, X, Image as ImageIcon } from 'lucide-react';

interface PolaroidViewfinderProps {
  engine: GameEngine;
  onClose: () => void;
  onOpenAlbum: () => void;
}

export const PolaroidViewfinder: React.FC<PolaroidViewfinderProps> = ({
  engine,
  onClose,
  onOpenAlbum,
}) => {
  const isViewfinder = polaroidManager.isViewfinderOpen;
  const isDeveloping = polaroidManager.isDeveloping;
  const lastPhoto = polaroidManager.lastCapturedPhoto;
  const remainingFilm = polaroidManager.remainingFilm;
  const flashActive = polaroidManager.flashActive;

  const handleSnap = () => {
    engine.takePolaroidPhoto();
  };

  return (
    <>
      {/* High-Voltage Xenon Flash Screen Burst */}
      {flashActive && (
        <div className="fixed inset-0 z-50 pointer-events-none bg-white/95 animate-out fade-out duration-300" />
      )}

      {/* Viewfinder Overlay Frame */}
      {isViewfinder && (
        <div className="fixed inset-0 z-30 pointer-events-none select-none flex flex-col justify-between">
          {/* Matte Dark Camera Viewfinder Border */}
          <div className="absolute inset-0 border-[36px] sm:border-[48px] md:border-[64px] border-black/80 backdrop-blur-[1px] pointer-events-auto" />

          {/* Viewfinder Header Controls */}
          <div className="relative z-40 px-6 pt-6 flex items-center justify-between text-xs pointer-events-auto">
            <div className="flex items-center gap-3 bg-black/75 px-4 py-2 rounded-md border border-white/15 text-[#ece6d3] font-mono tracking-wider shadow-lg">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-red-600 animate-pulse" />
              <span>POLAROID 600 VIEW</span>
              <span className="text-white/40">|</span>
              <span className="text-[#e3a83a]">EXP 1/125s • f/11</span>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={onOpenAlbum}
                className="flex items-center gap-2 px-3.5 py-2 rounded-md bg-black/75 border border-white/20 hover:border-white/50 text-[#ece6d3] text-xs font-semibold backdrop-blur-md transition-all active:scale-95"
              >
                <ImageIcon className="w-4 h-4 text-[#e3a83a]" />
                <span>Album ({polaroidManager.photos.length})</span>
                <span className="hidden sm:inline text-[10px] text-white/50 bg-white/10 px-1.5 py-0.5 rounded font-mono">
                  TAB
                </span>
              </button>

              <button
                onClick={onClose}
                aria-label="Lower Camera"
                className="w-9 h-9 flex items-center justify-center rounded-md bg-black/75 border border-white/20 hover:bg-black/90 text-white transition-all active:scale-95"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Center Viewfinder Framing Crosshairs & Reticle */}
          <div className="relative flex-1 flex items-center justify-center pointer-events-none">
            {/* 1:1 Square Format Framing Box */}
            <div className="relative w-[min(72vw,72vh)] h-[min(72vw,72vh)] border-2 border-dashed border-white/30 rounded-sm">
              {/* Corner framing brackets */}
              <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-white/80" />
              <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-white/80" />
              <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-white/80" />
              <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-white/80" />

              {/* Center crosshair */}
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 pointer-events-none opacity-60">
                <div className="absolute left-1/2 top-0 bottom-0 w-[1.5px] -translate-x-1/2 bg-white/70" />
                <div className="absolute top-1/2 left-0 right-0 h-[1.5px] -translate-y-1/2 bg-white/70" />
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full border border-white/70" />
              </div>

              {/* Light Meter Gauge Needle on Right Edge */}
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex flex-col items-center gap-1 py-2 px-1 bg-black/60 rounded border border-white/10 text-[9px] font-mono text-white/70">
                <span>+</span>
                <div className="w-1.5 h-16 bg-white/20 rounded-full relative overflow-hidden">
                  <div className="absolute w-full h-2 bg-[#6cbe45] rounded-full top-7 animate-pulse" />
                </div>
                <span>-</span>
              </div>
            </div>
          </div>

          {/* Viewfinder Bottom Controls & Film Cartridge Counter */}
          <div className="relative z-40 px-6 pb-6 flex items-center justify-between pointer-events-auto">
            {/* Film Cartridge Counter */}
            <div className="flex items-center gap-2.5 px-4 py-2 rounded-md bg-black/80 border border-white/15 font-mono text-xs shadow-lg">
              <span className="text-[#9a9684]">FILM:</span>
              <span
                className={`font-bold px-2 py-0.5 rounded ${
                  remainingFilm > 2
                    ? 'bg-[#6cbe45]/20 text-[#6cbe45] border border-[#6cbe45]/40'
                    : remainingFilm > 0
                    ? 'bg-[#e3a83a]/20 text-[#e3a83a] border border-[#e3a83a]/40'
                    : 'bg-red-900/40 text-red-400 border border-red-500/40'
                }`}
              >
                0{remainingFilm} / 10
              </span>
              <span className="text-[10px] text-white/40 hidden sm:inline">600 INSTANT CARTRIDGE</span>
            </div>

            {/* Red Shutter Trigger Button */}
            <button
              onClick={handleSnap}
              disabled={remainingFilm <= 0}
              className={`flex items-center gap-2.5 px-6 py-3 rounded-full font-bold text-sm tracking-wide transition-all shadow-2xl active:scale-95 ${
                remainingFilm > 0
                  ? 'bg-red-600 hover:bg-red-500 text-white shadow-red-900/60 hover:shadow-[0_0_24px_rgba(220,38,38,0.7)]'
                  : 'bg-gray-800 text-gray-500 cursor-not-allowed border border-white/10'
              }`}
            >
              <Camera className="w-5 h-5" />
              <span>SNAP PHOTO</span>
              <span className="text-xs bg-white/20 px-1.5 py-0.5 rounded font-mono hidden sm:inline">
                CLICK / SPACE
              </span>
            </button>
          </div>
        </div>
      )}

      {/* Chemical Developing Polaroid Card Ejection Drawer (Bottom Left) */}
      {(isDeveloping || lastPhoto) && (
        <div
          className={`fixed left-6 bottom-6 z-40 transition-all duration-700 pointer-events-auto select-none ${
            isDeveloping ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-2 opacity-90 scale-95'
          }`}
        >
          <div className="w-[180px] sm:w-[210px] p-2.5 pb-4 bg-[#f4efe6] rounded shadow-2xl border border-black/30 text-black flex flex-col items-center">
            {/* Square photo print area */}
            <div className="relative w-full aspect-square bg-[#1f1e1c] rounded-sm overflow-hidden border border-black/20">
              {/* Prints develop after the ride: fresh emulsion only, no image or verdict. */}
              <div
                className="absolute inset-0"
                style={{ background: 'radial-gradient(circle at 40% 35%, #4a4a42 0%, #34352f 55%, #262722 100%)' }}
                aria-label="Undeveloped print"
              />
              {isDeveloping && (
                <div className="absolute inset-0 bg-[#2b2823]/40 mix-blend-color-burn pointer-events-none animate-pulse" />
              )}
            </div>

            {/* Handwritten Polaroid Bottom Border Caption */}
            <div className="w-full mt-2 text-center font-mono text-[10px] text-gray-700 leading-tight">
              <div className="font-bold truncate">{isDeveloping ? 'Ejecting…' : 'Develops after the ride'}</div>
              <div className="text-[9px] text-gray-500">
                CAR {lastPhoto?.carIndex === 0 ? 'A' : lastPhoto?.carIndex === 2 ? 'C' : 'B'} • {polaroidManager.remainingFilm} left
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
