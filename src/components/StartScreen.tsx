/**
 * Start Screen / Title Experience for Court Sq-Bound
 * Authentic NYC subway mosaic plaque and station briefing
 */
import React from 'react';
import { Smartphone, HelpCircle } from 'lucide-react';
import { haptics } from '../game/haptics';

interface StartScreenProps {
  onStart: (muted: boolean, debug: boolean) => void;
  isTouch: boolean;
}

export const StartScreen: React.FC<StartScreenProps> = ({ onStart, isTouch }) => {
  const [startMuted, setStartMuted] = React.useState(false);
  const [showDebug, setShowDebug] = React.useState(false);
  const [vibrate, setVibrate] = React.useState(haptics.enabled);
  const canVibrate = isTouch && haptics.supported;

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center overflow-y-auto p-4 sm:p-6 bg-black/80 backdrop-blur-md">
      <div className="w-full max-w-xl my-auto animate-in fade-in zoom-in-95 duration-400">
        {/* MTA Station Mosaic Tablet */}
        <div className="relative rounded-sm p-4 bg-[#e8e2cf] text-[#1b1d18] shadow-2xl border-4 border-[#1c241e]">
          {/* Mosaic Tile Texture Grid */}
          <div
            className="absolute inset-0 opacity-40 pointer-events-none"
            style={{
              backgroundImage:
                'linear-gradient(#b8b09a 1px, transparent 1px), linear-gradient(90deg, #b8b09a 1px, transparent 1px)',
              backgroundSize: '14px 14px',
            }}
          />

          {/* Mosaic Border Frame */}
          <div className="relative border-8 border-transparent p-4 sm:p-6 bg-[#e8e2cf]"
               style={{
                 borderImage: 'repeating-linear-gradient(90deg, #6cbe45 0 14px, #264a22 14px 28px, #e8e2cf 28px 42px) 8',
               }}>
            <h1 className="text-4xl sm:text-6xl font-black tracking-tight leading-none uppercase">
              Hoyt–<br />Schermerhorn
            </h1>
            <div className="mt-3 flex items-center gap-2 text-sm sm:text-base font-bold text-[#1b1d18]">
              <span className="w-6 h-6 rounded-full bg-[#6cbe45] text-black flex items-center justify-center text-xs font-black">
                G
              </span>
              <span>to Court Sq — 13 stops</span>
            </div>
          </div>
        </div>

        {/* Narrative & Gameplay Briefing */}
        <div className="mt-5 p-5 rounded bg-[#101411]/90 border border-white/10 text-[#ece6d3] text-sm sm:text-base leading-relaxed space-y-3.5 shadow-xl">
          <p className="text-[#ece6d3]/95">
            You're riding to Queens with your parents. Somewhere along the way, your perception starts to slip. Get to Court Square without losing your mind, and without letting them notice.
          </p>

          <div className="space-y-2 text-xs sm:text-sm text-[#ece6d3]/90 border-t border-white/10 pt-3">
            <p>
              <strong className="text-[#6cbe45] font-bold">1. Notice.</strong> When something in the car changes, look at it and hold <span className="text-white font-mono bg-white/10 px-1 py-0.5 rounded">FLAG</span>. Flags are private.
            </p>
            <p>
              <strong className="text-[#e3a83a] font-bold">2. Don't show it.</strong> Staring or whipping your head around while a parent is looking at you raises their suspicion. When they talk to you, answer like nothing is wrong.
            </p>
            <p>
              <strong className="text-white font-bold">3. Read the doors.</strong> At every stop you can stay on or step off. Assume stepping off is a trap. Your parents usually know when to get off, but they can be wrong. <span className="underline decoration-[#6cbe45] font-medium">The doors never lie.</span> Learn how a real stop sounds.
            </p>
          </div>

          <div className="text-xs text-[#9a9684] border-t border-white/10 pt-3 flex items-start gap-2">
            <HelpCircle className="w-4 h-4 text-[#9a9684] shrink-0 mt-0.5" />
            <span>
              {isTouch
                ? 'Drag screen to look. Hold the round FLAG button. Tap choices when asked. Play in landscape for the best field of view.'
                : 'Click inside the train to lock mouse. Move to look. Hold F to flag. Press 1, 2, or 3 to choose. Hold Space during restraint. P pauses, M mutes.'}
            </span>
          </div>

          {/* Orientation Tip for Mobile */}
          {isTouch && (
            <div className="flex items-center gap-2 text-xs text-[#e3a83a] bg-[#e3a83a]/10 p-2.5 rounded border border-[#e3a83a]/25">
              <Smartphone className="w-4 h-4 animate-tilt shrink-0" />
              <span>Best experienced with your phone turned sideways (landscape).</span>
            </div>
          )}
        </div>

        {/* Action Controls & Settings */}
        <div className="mt-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <button
            onClick={() => onStart(startMuted, showDebug)}
            className="px-6 py-3.5 rounded bg-[#6cbe45] hover:bg-[#7ad150] text-[#0f1a0b] font-extrabold text-base sm:text-lg tracking-wide transition-all shadow-lg active:scale-[0.98] flex items-center justify-center gap-2"
          >
            Board the Train
          </button>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-[#9a9684]">
            <label className="flex items-center gap-2 cursor-pointer hover:text-white transition-colors">
              <input
                type="checkbox"
                checked={startMuted}
                onChange={(e) => setStartMuted(e.target.checked)}
                className="w-4 h-4 rounded accent-[#6cbe45]"
              />
              Start muted
            </label>

            {canVibrate && (
              <label
                className="flex items-center gap-2 cursor-pointer hover:text-white transition-colors"
                title="At each stop, a soft pulse for every anomaly you caught on the way in"
              >
                <input
                  type="checkbox"
                  checked={vibrate}
                  onChange={(e) => {
                    setVibrate(e.target.checked);
                    haptics.setEnabled(e.target.checked);
                  }}
                  className="w-4 h-4 rounded accent-[#6cbe45]"
                />
                Vibrate for catches
              </label>
            )}

            <label className="flex items-center gap-2 cursor-pointer hover:text-white transition-colors">
              <input
                type="checkbox"
                checked={showDebug}
                onChange={(e) => setShowDebug(e.target.checked)}
                className="w-4 h-4 rounded accent-[#6cbe45]"
              />
              Debug overlay
            </label>
          </div>
        </div>
      </div>
    </div>
  );
};
