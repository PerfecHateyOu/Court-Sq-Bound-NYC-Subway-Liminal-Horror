/**
 * HUD Component for Court Sq-Bound
 * Authentic NYC subway graphic aesthetic: reticle with flag progress ring,
 * G-bullet station indicator, LED PA banner, subtitles, glitching dialogue options,
 * and debug overlay.
 */
import React from 'react';
import { GameEngine } from '../game/gameState';
import { STOPS, TIER_NAMES, CFG } from '../constants';
import { Volume2, VolumeX, Pause } from 'lucide-react';
import { audioEngine } from '../audio/audioEngine';

interface HUDProps {
  engine: GameEngine;
  onPause: () => void;
  onToggleMute: () => void;
  isMuted: boolean;
  onFlagDown: () => void;
  onFlagUp: () => void;
}

export const HUD: React.FC<HUDProps> = ({
  engine,
  onPause,
  onToggleMute,
  isMuted,
  onFlagDown,
  onFlagUp,
}) => {
  const G = engine;
  if (G.phase === 'menu' || G.phase === 'end') return null;

  const nextStopName = G.seg ? (G.seg.b ? STOPS[6] : STOPS[G.seg.stop]) : STOPS[2];
  const isRestraint = !!G.restraint;
  const isTrial = G.phase === 'trial';

  // Flag hold progress ring calculation
  const flagProgRatio = Math.max(0, Math.min(1, G.flagLock ? 1 : G.flagProg / 0.7));
  const dashOffset = 88 * (1 - flagProgRatio);
  const isNoted = G.GT - G.notedT < 0.6;

  // Choice options
  const choice = G.choice;
  const showChoices = !!choice;

  const b = G.getBand(G.bandStop);

  return (
    <div className="fixed inset-0 pointer-events-none select-none z-20">
      {/* Central Reticle */}
      {!isTrial && (
        <div
          className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[38px] h-[38px] transition-opacity duration-300 ${
            isNoted ? 'scale-110' : ''
          }`}
        >
          <svg className="w-full h-full -rotate-90" viewBox="0 0 38 38">
            <circle
              cx="19"
              cy="19"
              r="14"
              fill="none"
              stroke={isNoted ? '#ffffff' : '#6cbe45'}
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeDasharray="88"
              style={{ strokeDashoffset: `${dashOffset}` }}
            />
          </svg>
          <div className="absolute left-1/2 top-1/2 w-1.5 h-1.5 -ml-[3px] -mt-[3px] rounded-full bg-[#ece6d3]/80" />
        </div>
      )}

      {/* Top Bar: Next Station Indicator */}
      <div className="absolute left-4 top-4 flex items-center gap-2.5 px-3 py-1.5 rounded bg-black/60 backdrop-blur-sm border border-white/10 text-xs sm:text-sm">
        <span className="w-6 h-6 rounded-full bg-[#6cbe45] text-black font-extrabold flex items-center justify-center text-xs">
          G
        </span>
        <span className="text-[#9a9684]">Next:</span>
        <b className="text-[#ece6d3] font-bold tracking-tight">{nextStopName}</b>
      </div>

      {/* Top Right Controls: Mute and Pause */}
      <div className="absolute right-4 top-4 flex items-center gap-2 pointer-events-auto">
        <button
          onClick={onToggleMute}
          aria-label={isMuted ? 'Unmute' : 'Mute'}
          className={`h-10 px-3 flex items-center gap-1.5 rounded-full border border-white/15 bg-black/60 text-xs font-semibold backdrop-blur-sm transition-colors hover:bg-black/80 ${
            isMuted ? 'text-[#e3a83a] border-[#e3a83a]/40' : 'text-[#ece6d3]'
          }`}
        >
          {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          <span className="hidden sm:inline">{isMuted ? 'Muted' : 'Sound on'}</span>
        </button>

        <button
          onClick={onPause}
          aria-label="Pause"
          className="w-10 h-10 flex items-center justify-center rounded-full border border-white/15 bg-black/60 text-[#ece6d3] backdrop-blur-sm hover:bg-black/80 transition-colors"
        >
          <Pause className="w-4 h-4" />
        </button>
      </div>

      {/* Subway PA Announcement LED Display */}
      {G.paText && (
        <div className="absolute left-1/2 top-16 -translate-x-1/2 max-w-[min(90vw,640px)] px-4 py-2 rounded bg-[#120d05] border border-[#3a2a10] text-[#e3a83a] text-center font-bold text-sm sm:text-base tracking-wide shadow-lg animate-in fade-in duration-300">
          <span className="inline-block w-2 h-2 rounded-full bg-[#e3a83a] mr-2 animate-ping" />
          {G.paText}
        </div>
      )}

      {/* Contextual Hint */}
      {G.hintText && G.GT < G.hintUntil && (
        <div className="absolute left-1/2 top-28 -translate-x-1/2 max-w-[90vw] px-3.5 py-1.5 rounded bg-black/75 border border-white/10 text-[#ece6d3] text-xs sm:text-sm text-center shadow-md">
          {G.hintText}
        </div>
      )}

      {/* Subtitles (Conversations, Parent Reactions) */}
      {G.subHtml && (
        <div
          className={`absolute left-1/2 -translate-x-1/2 max-w-[min(92vw,680px)] px-4 py-2.5 rounded bg-black/75 backdrop-blur-md border border-white/10 text-center text-sm sm:text-base text-[#ece6d3] leading-relaxed shadow-lg transition-all duration-300 ${
            showChoices ? 'bottom-28' : isRestraint ? 'bottom-32' : 'bottom-16'
          }`}
          dangerouslySetInnerHTML={{ __html: G.subHtml }}
        />
      )}

      {/* Choice Buttons Bar (Doors & Mask Checks) */}
      {showChoices && choice && (
        <div className="absolute left-1/2 bottom-5 -translate-x-1/2 w-[min(calc(100vw-32px),760px)] flex flex-wrap gap-2.5 pointer-events-auto p-2 rounded-lg bg-black/85 backdrop-blur-md border border-white/15 shadow-2xl">
          {/* Progress Time Bar */}
          {isFinite(choice.window) && (
            <div className="w-full h-1 bg-white/15 rounded-full overflow-hidden mb-1">
              <div
                className="h-full bg-[#e3a83a] transition-all duration-100 ease-linear"
                style={{ width: `${Math.max(0, Math.min(100, (choice.left / choice.window) * 100))}%` }}
              />
            </div>
          )}

          {choice.items.map((item, idx) => (
            <button
              key={idx}
              onClick={() => G.pickChoiceIndex(idx)}
              className="flex-1 min-w-[160px] min-h-[46px] flex items-center gap-3 px-3.5 py-2.5 rounded bg-[#151916] hover:bg-[#202722] border border-white/15 hover:border-[#6cbe45] text-left text-sm sm:text-base text-[#ece6d3] transition-all active:scale-[0.98]"
            >
              <span className="w-6 h-6 rounded bg-black/60 border border-white/20 text-[#9a9684] flex items-center justify-center text-xs font-mono font-bold">
                {idx + 1}
              </span>
              <span className="flex-1 font-medium">{item.txt}</span>
            </button>
          ))}
        </div>
      )}

      {/* Hold / Flag Button (Bottom Right) */}
      {!showChoices && (
        <div className="absolute right-4 bottom-5 pointer-events-auto">
          <button
            onPointerDown={(e) => {
              e.preventDefault();
              onFlagDown();
            }}
            onPointerUp={onFlagUp}
            onPointerCancel={onFlagUp}
            onContextMenu={(e) => e.preventDefault()}
            className={`flex flex-col items-center justify-center rounded-full border transition-all active:scale-95 shadow-xl ${
              isRestraint
                ? 'w-24 h-24 sm:w-28 sm:h-28 bg-[#e3a83a]/20 hover:bg-[#e3a83a]/30 border-[#e3a83a] text-[#e3a83a]'
                : G.flagHeld
                ? 'w-20 h-20 sm:w-22 sm:h-22 bg-[#6cbe45]/30 border-[#6cbe45] text-[#ece6d3]'
                : 'w-20 h-20 sm:w-22 sm:h-22 bg-black/65 hover:bg-black/80 border-white/30 text-[#ece6d3]'
            }`}
          >
            <span className="font-extrabold tracking-wider text-xs sm:text-sm">
              {isRestraint ? 'HOLD' : 'FLAG'}
            </span>
            <small className="text-[10px] text-[#9a9684] font-normal">
              {isRestraint ? "don't let go" : 'hold to catch'}
            </small>
          </button>
        </div>
      )}

      {/* Spoilers Debug Overlay */}
      {G.debug && (
        <div className="absolute left-4 top-16 p-3 rounded bg-black/85 border border-[#6cbe45]/40 text-[#6cbe45] font-mono text-[11px] leading-relaxed max-w-sm pointer-events-auto z-30">
          <div className="font-bold border-b border-white/10 pb-1 mb-1 text-white">
            DEBUG: Stop {G.seg ? `${G.seg.stop}${G.seg.b ? 'b' : ''}` : '1'} ({G.phase}) | TS: {G.ts.toFixed(1)}s
          </div>
          <div>Sanity: {G.san.toFixed(0)} (Band: {b[0]}–{b[1]}) | Tier: {TIER_NAMES[G.tier]}</div>
          <div>Suspicion: {G.sus} (Peak: {G.peak})</div>
          <div>Gaze: {G.gazeTid || '—'} ({G.dwell.toFixed(1)}s)</div>
          <div>AngVel: {G.angVel.toFixed(1)} / {CFG.snapThresh} (Arc: {G.snapArc.toFixed(2)})</div>
          <div>
            Parents: {G.carBuilder.parents.map((p) => `${p.label}:${p.frozen ? 'FROZEN' : p.facing ? 'WATCHING' : p.mode}`).join(' | ')}
          </div>
          <div className="mt-1 font-semibold text-white">Active Anomalies:</div>
          {G.active.map((a, i) => (
            <div key={i} className="pl-2">
              • {a.id} {a.at !== null ? '[LIVE]' : `@${a.trigger.toFixed(0)}s`} [{a.tids[0]}]
            </div>
          ))}
          <div className="mt-1">
            Flags: {G.segFlags.length ? G.segFlags.map((f) => f.tid).join(', ') : '—'}
          </div>
          <div>Acc: ✓{G.acc.correct} | ✗{G.acc.miss} | FP:{G.acc.fp}</div>
        </div>
      )}
    </div>
  );
};
