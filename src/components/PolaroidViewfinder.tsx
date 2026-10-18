/**
 * Vintage Polaroid 600 Viewfinder Overlay
 * Features mechanical viewfinder mask, optical crosshairs, film counter, and flash trigger.
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
  if (!polaroidManager.isViewfinderOpen) return null;

  const handleSnap = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (polaroidManager.remainingFilm <= 0) return;
    const windowWithR = window as any;
    if (windowWithR.__R) {
      polaroidManager.snapPhoto(
        windowWithR.__R.renderer,
        windowWithR.__R.scene,
        windowWithR.__R.camera,
        engine.segIdx,
        engine.seg ? String(engine.seg.stop) : '1',
        engine.routeId,
        () => engine.activeAnomaliesInFrustum()
      );
    }
  };

  return (
    <div
      className="fixed inset-0 z-40 pointer-events-none flex flex-col items-center justify-between p-4 sm:p-6"
    >
      {/* Flash overlay animation */}
      {polaroidManager.flashActive && (
        <div className="fixed inset-0 bg-white z-50 animate-out fade-out duration-200" />
      )}

      {/* Top Bar: Film Counter and Album Button */}
      <div className="w-full max-w-xl flex items-center justify-between pointer-events-auto">
        <div className="flex items-center gap-2 bg-black/80 px-3 py-1.5 rounded-full border border-white/20 text-xs font-mono text-[#ece6d3]">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          <span>FILM:</span>
          <b className="text-white text-sm">{polaroidManager.remainingFilm}</b>
          <span className="text-[#8d8371]">/ 10</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onOpenAlbum}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/80 hover:bg-black border border-white/20 text-xs font-bold text-[#ece6d3] transition-all"
          >
            <ImageIcon className="w-3.5 h-3.5 text-[#6cbe45]" />
            <span>ALBUM</span>
          </button>
          <button
            onClick={onClose}
            aria-label="Close Viewfinder"
            className="w-8 h-8 rounded-full bg-black/80 hover:bg-black border border-white/20 text-white flex items-center justify-center transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Center Viewfinder Framing Box */}
      <div className="relative w-64 h-64 sm:w-80 sm:h-80 border-2 border-white/40 rounded-sm pointer-events-none shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]">
        {/* Corner framing marks */}
        <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-[#e3a83a]" />
        <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-[#e3a83a]" />
        <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-[#e3a83a]" />
        <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-[#e3a83a]" />

        {/* Center reticle */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 flex items-center justify-center opacity-60">
          <div className="w-full h-0.5 bg-white" />
          <div className="h-full w-0.5 bg-white absolute" />
        </div>
      </div>

      {/* Bottom Shutter Snap Trigger */}
      <div className="w-full max-w-xl flex flex-col items-center gap-2 pointer-events-auto pb-4">
        <button
          onClick={handleSnap}
          disabled={polaroidManager.remainingFilm <= 0}
          className={`h-16 px-8 flex items-center gap-3 rounded-full border-2 font-black tracking-wider shadow-2xl transition-all active:scale-95 ${
            polaroidManager.remainingFilm > 0
              ? 'bg-red-600 hover:bg-red-500 text-white border-red-300'
              : 'bg-zinc-800 text-zinc-500 border-zinc-700 cursor-not-allowed'
          }`}
        >
          <Camera className="w-6 h-6 fill-current" />
          <span className="text-base sm:text-lg">
            {polaroidManager.remainingFilm > 0 ? 'SNAP PHOTO [SPACE]' : 'OUT OF FILM'}
          </span>
        </button>
        <span className="text-[11px] font-mono text-white/60">
          Click or press Space / Left Click to expose silver print
        </span>
      </div>
    </div>
  );
};
