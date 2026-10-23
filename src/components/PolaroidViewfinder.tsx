/**
 * Vintage Polaroid 600 Camera Viewfinder & Chemical Film Development Overlay
 * Displays authentic vintage camera HUD with viewfinder framing, exposure meter,
 * film cartridge counter, high-voltage flash burst flare, and chemical print development.
 */
import { settings } from '../settings';
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
  // What the shutter button says when it can't fire: the last print is still coming out, or the
  // pack is empty.
  const ejecting = remainingFilm > 0 && !engine.shutterReady;
  const shutterStatus = remainingFilm <= 0 ? 'OUT OF FILM' : ejecting ? 'EJECTING\u2026' : null;

  return (
    <>
      {/* High-Voltage Xenon Flash Screen Burst */}
      {flashActive && (
        // With screen effects reduced, a soft glow instead of a full white burst.
        <div
          data-testid="camera-flash"
          className={`fixed inset-0 z-50 pointer-events-none animate-out fade-out duration-300 ${
            settings.effectsReduced() ? 'bg-white/25' : 'bg-white/95'
          }`}
        />
      )}

      {/* Viewfinder Overlay Frame */}
      {isViewfinder && (
        <div className="fixed inset-0 z-30 pointer-events-none select-none flex flex-col justify-between pt-[env(safe-area-inset-top)] pr-[env(safe-area-inset-right)] pb-[env(safe-area-inset-bottom)] pl-[env(safe-area-inset-left)]">
          {/* Matte Dark Camera Viewfinder Border */}
          <div className="absolute inset-0 border-[36px] sm:border-[48px] md:border-[64px] border-black/80 backdrop-blur-[1px] pointer-events-auto" />

          {/* Viewfinder Header Controls */}
          <div className="relative z-40 px-3 pt-3 sm:px-6 sm:pt-6 flex items-center justify-between gap-2 text-xs pointer-events-auto">
            <div className="min-w-0 flex items-center gap-3 bg-black/75 px-3 sm:px-4 py-2 rounded-md border border-white/15 text-cream font-mono tracking-wider shadow-lg">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-red-600 animate-pulse" />
              <span>POLAROID 600 VIEW</span>
              <span className="hidden sm:inline text-white/40">|</span>
              <span className="hidden sm:inline text-warn">EXP 1/125s • f/11</span>
            </div>

            <div className="shrink-0 flex items-center gap-2 sm:gap-3">
              <button
                onClick={onOpenAlbum}
                aria-label={`Evidence Log (${polaroidManager.photos.length} ${polaroidManager.photos.length === 1 ? 'print' : 'prints'})`}
                className="h-10 flex items-center gap-2 px-3.5 rounded-md bg-black/75 border border-white/20 hover:border-white/50 text-cream text-xs font-semibold backdrop-blur-md transition-all active:scale-95"
              >
                <ImageIcon className="w-4 h-4 text-warn" />
                <span>Evidence ({polaroidManager.photos.length})</span>
                <span className="hidden sm:pointer-fine:inline text-3xs text-white/50 bg-white/10 px-1.5 py-0.5 rounded font-mono">
                  TAB
                </span>
              </button>

              <button
                onClick={onClose}
                aria-label="Lower Camera"
                className="w-10 h-10 flex items-center justify-center rounded-md bg-black/75 border border-white/20 hover:bg-black/90 text-white transition-all active:scale-95"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Center Viewfinder Framing Crosshairs & Reticle */}
          <div className="relative flex-1 min-h-0 flex items-center justify-center pointer-events-none">
            {/* 1:1 Square Format Framing Box */}
            <div className="relative w-[min(72vw,72vh,100dvh-170px)] h-[min(72vw,72vh,100dvh-170px)] border-2 border-dashed border-white/30 rounded-sm">
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
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex flex-col items-center gap-1 py-2 px-1 bg-black/60 rounded border border-white/10 text-4xs font-mono text-white/70">
                <span>+</span>
                <div className="w-1.5 h-16 bg-white/20 rounded-full relative overflow-hidden">
                  <div className="absolute w-full h-2 bg-g-line rounded-full top-7 animate-pulse" />
                </div>
                <span>-</span>
              </div>
            </div>
          </div>

          {/* Viewfinder Bottom Controls & Film Cartridge Counter */}
          <div className="relative z-40 px-3 pb-3 sm:px-6 sm:pb-6 flex items-center justify-between gap-2 pointer-events-auto">
            {/* Film Cartridge Counter */}
            <div className="flex items-center gap-2.5 px-4 py-2 rounded-md bg-black/80 border border-white/15 font-mono text-xs shadow-lg">
              <span className="text-dim">FILM:</span>
              <span
                className={`font-bold px-2 py-0.5 rounded ${
                  remainingFilm > 2
                    ? 'bg-g-line/20 text-g-line border border-g-line/40'
                    : remainingFilm > 0
                    ? 'bg-warn/20 text-warn border border-warn/40'
                    : 'bg-red-900/40 text-red-400 border border-red-500/40'
                }`}
              >
                {String(remainingFilm).padStart(2, '0')} / 10
              </span>
              <span className="text-3xs text-white/40 hidden sm:inline">600 INSTANT CARTRIDGE</span>
            </div>

            {/* Red Shutter Trigger Button */}
            <button
              onClick={handleSnap}
              disabled={remainingFilm <= 0}
              aria-disabled={ejecting || undefined}
              aria-label={shutterStatus ? `SNAP PHOTO: ${shutterStatus.toLowerCase()}` : 'SNAP PHOTO'}
              data-testid="shutter"
              className={`shrink-0 flex items-center gap-2.5 px-5 sm:px-6 py-3 rounded-full font-bold text-sm tracking-wide transition-all shadow-2xl active:scale-95 ${
                remainingFilm <= 0
                  ? 'bg-gray-800 text-gray-500 cursor-not-allowed border border-white/10'
                  : ejecting
                  ? 'bg-red-900 text-white/60 cursor-wait'
                  : 'bg-red-600 hover:bg-red-500 text-white shadow-red-900/60 hover:shadow-[0_0_24px_rgba(220,38,38,0.7)]'
              }`}
            >
              <Camera className="w-5 h-5" />
              <span>{shutterStatus ?? 'SNAP PHOTO'}</span>
              <span className={`text-xs bg-white/20 px-1.5 py-0.5 rounded font-mono hidden ${shutterStatus ? '' : 'sm:pointer-fine:inline'}`}>
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
          <div className="w-[180px] sm:w-[210px] p-2.5 pb-4 bg-film rounded shadow-2xl border border-black/30 text-black flex flex-col items-center">
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
            <div className="w-full mt-2 text-center font-mono text-3xs text-gray-700 leading-tight">
              <div className="font-bold truncate">{isDeveloping ? 'Ejecting…' : 'Develops after the ride'}</div>
              <div className="text-4xs text-gray-500">
                CAR {lastPhoto?.carIndex === 0 ? 'A' : lastPhoto?.carIndex === 2 ? 'C' : 'B'} • {polaroidManager.remainingFilm} left
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
