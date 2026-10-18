/**
 * Start Screen / Title Experience for Court Sq-Bound
 * Authentic NYC subway mosaic plaque and station briefing, plus the Case Files dossier.
 */
import React from 'react';
import { Smartphone, HelpCircle, Settings as SettingsIcon, BookOpen, X } from 'lucide-react';
import { loadArchive, entryState, PSYCH_ENTRIES, PSYCH_IDS, PSYCH_CLASS } from '../game/psychLog';
import { loadEvpArchive, EVP_SIGNALS } from '../game/evpManager';
import { loadEndingsArchive, ENDING_IDS } from '../game/endings';
import { useProgressEpoch } from '../settings';
import { useEscape } from '../ui/escape';
import { CaseFilesModal } from './CaseFilesModal';
import { GameEngine } from '../game/gameState';

interface StartScreenProps {
  onStart: (muted: boolean, debug: boolean) => void;
  onOpenSettings: () => void;
  isTouch: boolean;
  engine?: GameEngine;
}

export const StartScreen: React.FC<StartScreenProps> = ({ onStart, onOpenSettings, isTouch, engine }) => {
  const [startMuted, setStartMuted] = React.useState(false);
  const [showDebug, setShowDebug] = React.useState(false);
  const [showLog, setShowLog] = React.useState(false);

  // Re-read when the Case Files open and after saved progress is erased in Settings.
  const progressEpoch = useProgressEpoch();
  const archive = React.useMemo(() => loadArchive(), [showLog, progressEpoch]);
  useEscape(() => setShowLog(false), showLog);
  const documentedCount = PSYCH_IDS.filter((id) => entryState(archive[id]) === 'documented').length;
  const tapeCount = React.useMemo(() => Object.keys(loadEvpArchive()).length, [showLog, progressEpoch]);
  const endingCount = React.useMemo(() => Object.keys(loadEndingsArchive()).length, [showLog, progressEpoch]);

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
                ? 'Drag the screen to look. Use the WALK stick (bottom left) to move between cars. Hold the round FLAG button. Tap choices when asked. Play in landscape for the best field of view.'
                : 'Click inside the train to lock mouse (or use Arrows / WASD). Hold F to flag. Press 1, 2, or 3 to choose. Hold Space during restraint. Esc or P pauses, M mutes.'}
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
            <button
              onClick={() => setShowLog(true)}
              className="flex items-center gap-1.5 py-1.5 px-2.5 -ml-2.5 sm:ml-0 rounded border border-transparent hover:border-white/20 text-[#ece6d3] font-semibold transition-colors"
            >
              <BookOpen className="w-4 h-4 text-[#6cbe45]" />
              Case Files ({documentedCount}/13)
            </button>

            <button
              onClick={onOpenSettings}
              className="flex items-center gap-1.5 py-1.5 px-2.5 rounded border border-transparent hover:border-white/20 text-[#ece6d3] font-semibold transition-colors"
            >
              <SettingsIcon className="w-4 h-4" />
              Settings
            </button>

            <label className="flex items-center gap-2 cursor-pointer hover:text-white transition-colors">
              <input
                type="checkbox"
                checked={startMuted}
                onChange={(e) => setStartMuted(e.target.checked)}
                className="w-4 h-4 rounded accent-[#6cbe45]"
              />
              Start muted
            </label>

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

        {/* Case Files Dossier Modal */}
        {showLog && (
          <CaseFilesModal engine={engine} onClose={() => setShowLog(false)} />
        )}
      </div>
    </div>
  );
};
