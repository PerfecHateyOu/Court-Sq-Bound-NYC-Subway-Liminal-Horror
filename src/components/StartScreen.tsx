/**
 * Start Screen / Title Experience for LAST LOCAL
 * Authentic NYC subway mosaic plaque and station briefing, plus the Case Files dossier.
 */
import React from 'react';
import { Smartphone, Keyboard, Hand, Settings as SettingsIcon, BookOpen, GraduationCap, Lock } from 'lucide-react';
import { loadArchive, entryState, PSYCH_ENTRIES, PSYCH_IDS, PSYCH_CLASS } from '../game/psychLog';
import { loadEvpArchive, EVP_SIGNALS } from '../game/evpManager';
import { loadEndingsArchive, ENDING_IDS } from '../game/endings';
import { useProgressEpoch } from '../settings';
import { CaseFilesModal } from './CaseFilesModal';
import { GameEngine } from '../game/gameState';
import { CHAPTERS } from '../constants';
import { chapterOrigin } from '../game/practice';
import { BRIEFING_CONTROLS, CONTROLS, how, type InputKind } from '../ui/controls';

/** "SIGNAL DRIFT" → "Signal Drift" */
const titleCase = (t: string) => t.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());

/** Key names in a control description, shown as key caps ("Hold F", "Esc or P"). */
const KEY_TOKEN = /\b(F|C|M|P|Tab|Esc|Space|WASD|1|2|3)\b/g;
const Keys: React.FC<{ text: string }> = ({ text }) => (
  <>
    {text.split(KEY_TOKEN).map((part, i) =>
      i % 2 ? (
        <kbd key={i} className="inline-block min-w-[1.4em] px-1 rounded border border-white/25 bg-white/10 font-mono text-[0.92em] text-cream text-center leading-snug">
          {part}
        </kbd>
      ) : (
        part
      )
    )}
  </>
);

/** Secondary title actions share one look: icon + label, same height and gap. */
const SECONDARY =
  'tap inline-flex items-center justify-center gap-1.5 h-10 touch:h-11 px-3 rounded border border-white/15 bg-white/5 hover:bg-white/10 hover:border-white/30 active:translate-y-px text-cream text-xs sm:text-sm font-semibold transition-colors';

interface StartScreenProps {
  onStart: (nightmare: boolean, startChapter: number) => void;
  onOpenSettings: () => void;
  /** Replay the practice stretch (it runs by itself before the first ride). */
  onPractice?: () => void;
  isTouch: boolean;
  engine?: GameEngine;
}

export const StartScreen: React.FC<StartScreenProps> = ({ onStart, onOpenSettings, onPractice, isTouch, engine }) => {
  const input: InputKind = isTouch ? 'touch' : 'keyboard';
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
      <div className="start-card w-full max-w-xl my-auto animate-in fade-in zoom-in-95 duration-400">
        {/* Game Title & Branding Header */}
        <div className="start-head mb-4 text-center select-none">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded bg-panel/90 border border-white/10 text-3xs sm:text-2xs font-mono tracking-[0.22em] text-dim uppercase mb-1.5 shadow-md">
            <span>A Liminal Subway Horror Game</span>
          </div>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight uppercase text-white drop-shadow-md">
            LAST LOCAL
          </h1>
          <p className="start-tagline text-2xs min-[360px]:text-xs sm:text-sm font-mono text-g-line tracking-normal min-[360px]:tracking-wide mt-1">
            Every stop takes you further from home.
          </p>
          <div className="start-motto text-3xs sm:text-2xs font-mono tracking-[0.1em] min-[360px]:tracking-[0.2em] text-faint uppercase mt-0.5">
            New York City · Last Train · No Way Back
          </div>
        </div>

        {/* MTA Station Mosaic Tablet */}
        <div className="start-plaque relative rounded-sm p-2 sm:p-4 bg-paper text-paper-ink shadow-2xl border-4 border-[#1c241e]">
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
          <div className="start-frame relative border-8 border-transparent px-4 py-2 sm:p-6 bg-paper"
               style={{
                 borderImage: 'repeating-linear-gradient(90deg, #6cbe45 0 14px, #264a22 14px 28px, #e8e2cf 28px 42px) 8',
               }}>
            {/* Scales with the screen; breaks only after "Hoyt–", never inside a word. */}
            <h2 className="text-[clamp(1.5rem,7.5vw,3rem)] font-black tracking-tight leading-none uppercase [overflow-wrap:normal] hyphens-none">
              Hoyt–<br />Schermerhorn
            </h2>
            <div className="mt-2 sm:mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm sm:text-base font-bold text-paper-ink">
              <span className="w-6 h-6 rounded-full bg-g-line text-black flex items-center justify-center text-xs font-black">
                G
              </span>
              <span className="whitespace-nowrap">LAST LOCAL — to Court Sq</span>
              <span className="px-1.5 py-0.5 rounded-sm bg-paper-ink text-cream font-mono text-3xs tracking-wider whitespace-nowrap">13 STOPS</span>
            </div>
          </div>
        </div>

        {/* Board the Train, then the secondary actions as one row, then what's locked */}
        <div className="start-actions mt-4 flex flex-col gap-3">
          <button
            onClick={() => onStart(nightmareUnlocked && nightmare, nightmareUnlocked ? startChapter : 1)}
            className="px-6 py-3.5 rounded bg-g-line hover:bg-g-line-hi text-g-line-ink font-extrabold text-base sm:text-lg tracking-wide transition-all shadow-lg active:translate-y-px focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cream flex items-center justify-center gap-2"
          >
            Board the Train
          </button>

          <div className="grid grid-cols-2 min-[420px]:flex min-[420px]:flex-wrap gap-2">
            <button onClick={() => setShowLog(true)} className={SECONDARY}>
              <BookOpen className="w-4 h-4 text-g-line" />
              Case Files ({documentedCount}/13)
            </button>
            <button onClick={onOpenSettings} className={SECONDARY}>
              <SettingsIcon className="w-4 h-4" />
              Settings
            </button>
            {onPractice && (
              <button onClick={() => onPractice()} className={`${SECONDARY} col-span-2 min-[420px]:col-span-1`}>
                <GraduationCap className="w-4 h-4 text-warn" />
                Practice stretch
              </button>
            )}
          </div>

          {nightmareUnlocked ? (
            <label
              className="tap self-start flex items-center gap-2 text-xs text-dim cursor-pointer hover:text-cream transition-colors"
              title="Faster train, flickering tubes, sharper-eyed parents, faster sanity loss"
            >
              <input
                type="checkbox"
                checked={nightmare}
                onChange={(e) => setNightmare(e.target.checked)}
                className="w-4 h-4 rounded accent-bad"
              />
              <span className={nightmare ? 'text-bad-hi font-semibold' : ''}>Nightmare mode</span>
            </label>
          ) : (
            <p
              className="flex items-center gap-2 px-3 py-2 rounded border border-dashed border-white/15 text-xs text-dim"
              data-testid="nightmare-locked"
            >
              <Lock className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              <span>Nightmare mode and chapter select: finish a ride to unlock</span>
            </p>
          )}
        </div>

        {nightmareUnlocked && (
          <div className="start-chapter mt-3 flex flex-col sm:flex-row sm:items-center gap-x-3 gap-y-1.5 text-xs text-dim">
            <label className="flex items-center gap-2">
              <span className="text-cream font-semibold">Start from</span>
              <select
                value={startChapter}
                onChange={(e) => setStartChapter(Number(e.target.value))}
                className="bg-panel border border-white/20 rounded px-2 py-1.5 text-cream text-xs max-w-[17rem]"
              >
                {CHAPTERS.map((c) => (
                  <option key={c.index} value={c.index}>
                    {`Chapter ${c.numeral.split(' ')[1]}: ${titleCase(c.title)}, from ${chapterOrigin(c.index)}`}
                  </option>
                ))}
              </select>
            </label>
            {startChapter > 1 && (
              <span data-testid="practice-note" className="text-warn">
                Practice run: no endings, badges, Case Files or tapes are saved.
              </span>
            )}
          </div>
        )}

        {/* Narrative & Gameplay Briefing: after the actions, so on a phone Board the Train is on the first screen */}
        <div className="start-brief mt-4 p-5 rounded bg-panel/90 border border-white/10 text-cream text-sm sm:text-base leading-relaxed space-y-3.5 shadow-xl">
          <p className="text-cream/95">
            You're on the Last Local to Queens with your parents. Somewhere along the way, your perception starts to slip. Get to Court Square without losing your mind, and without letting them notice.
          </p>

          <div className="space-y-2 text-xs sm:text-sm text-cream/90 border-t border-white/10 pt-3">
            <p>
              <strong className="text-g-line font-bold">1. Notice.</strong> When something in the car changes, look at it and hold <span className="text-white font-mono bg-white/10 px-1 py-0.5 rounded">FLAG</span>. Flags are private.
            </p>
            <p>
              <strong className="text-warn font-bold">2. Don't show it.</strong> Staring or whipping your head around while a parent is looking at you raises their suspicion. When they talk to you, answer like nothing is wrong.
            </p>
            <p>
              <strong className="text-white font-bold">3. Read the doors.</strong> At every stop you can stay on or step off. Assume stepping off is a trap. Your parents usually know when to get off, but they can be wrong. <span className="underline decoration-g-line font-medium">The doors never lie.</span> Learn how a real stop sounds.
            </p>
          </div>

          {/* Controls: only this device's input (src/ui/controls.ts is the one list) */}
          <div className="border-t border-white/10 pt-3" data-testid="start-controls">
            <h3 className="flex items-center gap-1.5 text-2xs font-extrabold uppercase tracking-[0.12em] text-dim mb-2">
              {isTouch ? <Hand className="w-3.5 h-3.5" aria-hidden="true" /> : <Keyboard className="w-3.5 h-3.5" aria-hidden="true" />}
              Controls · {isTouch ? 'Touch' : 'Keyboard and mouse'}
            </h3>
            <dl className="grid grid-cols-[max-content_1fr] gap-x-3 gap-y-1 text-xs">
              {BRIEFING_CONTROLS.map((id) => (
                <React.Fragment key={id}>
                  <dt className="text-dim">{CONTROLS[id].action}</dt>
                  <dd className="text-cream/90">{isTouch ? how(id, input) : <Keys text={how(id, input)} />}</dd>
                </React.Fragment>
              ))}
            </dl>
            {isTouch && (
              <p className="landscape:hidden mt-2 flex items-center gap-2 text-xs text-warn" data-testid="landscape-tip">
                <Smartphone className="w-4 h-4 shrink-0 animate-tilt calm:animate-none" aria-hidden="true" />
                Turn your phone sideways for the widest view.
              </p>
            )}
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
