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

interface StartScreenProps {
  onStart: (muted: boolean, debug: boolean) => void;
  onOpenSettings: () => void;
  isTouch: boolean;
}

export const StartScreen: React.FC<StartScreenProps> = ({ onStart, onOpenSettings, isTouch }) => {
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
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md"
            onPointerDown={(e) => {
              if (e.target === e.currentTarget) setShowLog(false);
            }}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="case-files-title"
              className="w-full max-w-xl max-h-[85vh] overflow-y-auto bg-[#e8e2cf] text-[#1b1d18] p-5 sm:p-7 rounded shadow-2xl border border-[#9f9883]"
            >
              <div className="flex items-start justify-between border-b-2 border-[#1b1d18] pb-3 mb-4">
                <div>
                  <h2 id="case-files-title" className="text-2xl font-black uppercase tracking-tight">Psychological Case Files</h2>
                  <p className="text-xs text-[#55574c] mt-0.5">
                    {documentedCount} of 13 cataloged anomaly types documented on this device.
                  </p>
                  <p className="text-xs text-[#55574c]" data-testid="case-files-tapes">
                    Recordings: {tapeCount} of {EVP_SIGNALS.length} broadcasts on tape.
                  </p>
                  <p className="text-xs text-[#55574c]" data-testid="case-files-endings">
                    Endings: {endingCount} of {ENDING_IDS.length} reached.
                  </p>
                </div>
                <button
                  onClick={() => setShowLog(false)}
                  className="p-1 rounded hover:bg-black/10 text-[#1b1d18] transition-colors"
                  aria-label="Close Case Files"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <ul className="divide-y divide-[#c4bda7] text-xs">
                {PSYCH_IDS.map((id) => {
                  const def = PSYCH_ENTRIES[id];
                  const state = entryState(archive[id]);
                  const rec = archive[id];

                  return (
                    <li key={id} className="py-2.5">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="font-mono font-bold text-[10px] text-[#55574c] uppercase tracking-wider">
                          Class {PSYCH_CLASS[def.tier]}
                        </span>
                        <div className="flex items-center gap-1.5">
                          {state === 'documented' && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#6cbe45]/30 text-[#204a18]">
                              DOCUMENTED
                            </span>
                          )}
                          {state === 'unconfirmed' && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#e3a83a]/30 text-[#6d4b0f]">
                              UNCONFIRMED
                            </span>
                          )}
                          {state === 'redacted' && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-black/10 text-[#55574c]">
                              REDACTED
                            </span>
                          )}
                        </div>
                      </div>

                      {state === 'documented' && (
                        <div className="mt-1">
                          <strong className="font-extrabold text-[#1b1d18] text-sm">{def.title}</strong>
                          <p className="mt-0.5 text-[#3a3b34] leading-relaxed">{def.note}</p>
                          <div className="mt-1 text-[10px] text-[#55574c]">
                            Encountered {rec.seen} time{rec.seen === 1 ? '' : 's'}, caught {rec.caught}.
                          </div>
                        </div>
                      )}

                      {state === 'unconfirmed' && (
                        <div className="mt-1">
                          <strong className="font-extrabold text-[#1b1d18] text-sm">{def.title}</strong>
                          <p className="mt-0.5 italic text-[#55574c] leading-relaxed">
                            Manifested before your eyes, but you failed to flag it in time. Notice what changes next time.
                          </p>
                        </div>
                      )}

                      {state === 'redacted' && (
                        <div className="mt-1 italic text-[#777468]">
                          [Anomaly parameters not yet witnessed]
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>

              <div className="mt-5 pt-3 border-t border-[#9f9883] flex justify-end">
                <button
                  onClick={() => setShowLog(false)}
                  className="px-4 py-2 bg-[#1b1d18] hover:bg-[#2e312b] text-[#ece6d3] text-xs font-bold rounded transition-colors"
                >
                  Return to Briefing
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
