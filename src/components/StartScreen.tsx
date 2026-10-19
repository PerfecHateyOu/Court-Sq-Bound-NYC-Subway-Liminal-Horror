/**
 * Start Screen / Title Experience for LAST LOCAL
 * Authentic NYC subway mosaic plaque and station briefing, plus the Case Files dossier.
 */
import React from 'react';
import { Smartphone, HelpCircle, Settings as SettingsIcon, BookOpen, X } from 'lucide-react';
import { loadArchive, entryState, PSYCH_ENTRIES, PSYCH_IDS, PSYCH_CLASS } from '../game/psychLog';
import { loadEvpArchive, EVP_SIGNALS } from '../game/evpManager';
import { loadEndingsArchive, ENDING_IDS } from '../game/endings';
import { useProgressEpoch } from '../settings';
import { CaseFilesModal } from './CaseFilesModal';
import { GameEngine } from '../game/gameState';
import { CHAPTERS } from '../constants';
import { chapterOrigin } from '../game/practice';

/** "SIGNAL DRIFT" → "Signal Drift" */
const titleCase = (t: string) => t.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());

interface StartScreenProps {
  onStart: (muted: boolean, debug: boolean, nightmare: boolean, startChapter: number) => void;
  onOpenSettings: () => void;
  isTouch: boolean;
  engine?: GameEngine;
}

export const StartScreen: React.FC<StartScreenProps> = ({ onStart, onOpenSettings, isTouch, engine }) => {
  const [startMuted, setStartMuted] = React.useState(false);
  const [showDebug, setShowDebug] = React.useState(false);
  const [nightmare, setNightmare] = React.useState(false);
  // Chapter II and III are practice runs (nothing is saved); kept from the last ride's choice.
  const [startChapter, setStartChapter] = React.useState(() => engine?.startChapter ?? 1);
  // Nightmare and chapter select unlock after one completed ride (any ending; practice runs don't count).
  const nightmareUnlocked = React.useMemo(() => {
    try {
      return (JSON.parse(localStorage.getItem('gtrain-runs') || '[]') as unknown[]).length > 0;
    } catch {
      return false;
    }
  }, []);
  const [showLog, setShowLog] = React.useState(false);

  // Re-read when the Case Files open and after saved progress is erased in Settings.
  const progressEpoch = useProgressEpoch();
  const archive = React.useMemo(() => loadArchive(), [showLog, progressEpoch]);
  const documentedCount = PSYCH_IDS.filter((id) => entryState(archive[id]) === 'documented').length;
  const tapeCount = React.useMemo(() => Object.keys(loadEvpArchive()).length, [showLog, progressEpoch]);
  const endingCount = React.useMemo(() => Object.keys(loadEndingsArchive()).length, [showLog, progressEpoch]);

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center overflow-y-auto safe-pad bg-black/80 backdrop-blur-md">
      <div className="w-full max-w-xl my-auto animate-in fade-in zoom-in-95 duration-400">
        {/* Game Title & Branding Header */}
        <div className="mb-4 text-center select-none">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded bg-[#101411]/90 border border-white/10 text-[10px] sm:text-[11px] font-mono tracking-[0.22em] text-[#9a9684] uppercase mb-1.5 shadow-md">
            <span>A Liminal Subway Horror Game</span>
          </div>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight uppercase text-white drop-shadow-md">
            LAST LOCAL
          </h1>
          <p className="text-[11px] min-[360px]:text-xs sm:text-sm font-mono text-[#6cbe45] tracking-normal min-[360px]:tracking-wide mt-1">
            Every stop takes you further from home.
          </p>
          <div className="text-[10px] sm:text-[11px] font-mono tracking-[0.1em] min-[360px]:tracking-[0.2em] text-[#8d8371] uppercase mt-0.5">
            New York City · Last Train · No Way Back
          </div>
        </div>

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
            <h2 className="text-[26px] min-[360px]:text-3xl sm:text-5xl font-black tracking-tight leading-none uppercase">
              Hoyt–<br />Schermerhorn
            </h2>
            <div className="mt-3 flex items-center gap-2 text-sm sm:text-base font-bold text-[#1b1d18]">
              <span className="w-6 h-6 rounded-full bg-[#6cbe45] text-black flex items-center justify-center text-xs font-black">
                G
              </span>
              <span>LAST LOCAL — to Court Sq (13 stops)</span>
            </div>
          </div>
        </div>

        {/* Narrative & Gameplay Briefing */}
        <div className="mt-5 p-5 rounded bg-[#101411]/90 border border-white/10 text-[#ece6d3] text-sm sm:text-base leading-relaxed space-y-3.5 shadow-xl">
          <p className="text-[#ece6d3]/95">
            You're on the Last Local to Queens with your parents. Somewhere along the way, your perception starts to slip. Get to Court Square without losing your mind, and without letting them notice.
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
                : 'Click inside the train to look with the mouse (or use the arrow keys). Hold F to flag. Press 1, 2 or 3 to answer. Hold Space when told to. C raises the camera, Tab opens the evidence log, WASD walks between cars. Esc or P pauses, M mutes.'}
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
            onClick={() => onStart(startMuted, showDebug, nightmareUnlocked && nightmare, nightmareUnlocked ? startChapter : 1)}
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

            {nightmareUnlocked ? (
              <label className="flex items-center gap-2 cursor-pointer hover:text-white transition-colors" title="Faster train, flickering tubes, sharper-eyed parents, faster sanity loss">
                <input
                  type="checkbox"
                  checked={nightmare}
                  onChange={(e) => setNightmare(e.target.checked)}
                  className="w-4 h-4 rounded accent-[#c9513f]"
                />
                <span className={nightmare ? 'text-[#e8705e] font-semibold' : ''}>Nightmare mode</span>
              </label>
            ) : (
              <span className="text-[#6d6a5c]" data-testid="nightmare-locked">
                Nightmare mode and chapter select: finish a ride to unlock
              </span>
            )}

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

        {nightmareUnlocked && (
          <div className="mt-3 flex flex-col sm:flex-row sm:items-center gap-x-3 gap-y-1.5 text-xs text-[#9a9684]">
            <label className="flex items-center gap-2">
              <span className="text-[#ece6d3] font-semibold">Start from</span>
              <select
                value={startChapter}
                onChange={(e) => setStartChapter(Number(e.target.value))}
                className="bg-[#101411] border border-white/20 rounded px-2 py-1.5 text-[#ece6d3] text-xs max-w-[17rem]"
              >
                {CHAPTERS.map((c) => (
                  <option key={c.index} value={c.index}>
                    {`Chapter ${c.numeral.split(' ')[1]}: ${titleCase(c.title)}, from ${chapterOrigin(c.index)}`}
                  </option>
                ))}
              </select>
            </label>
            {startChapter > 1 && (
              <span data-testid="practice-note" className="text-[#e3a83a]">
                Practice run: no endings, badges, Case Files or tapes are saved.
              </span>
            )}
          </div>
        )}

        {/* Case Files Dossier Modal */}
        {showLog && (
          <CaseFilesModal engine={engine} onClose={() => setShowLog(false)} />
        )}
      </div>
    </div>
  );
};
