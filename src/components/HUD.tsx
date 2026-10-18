/**
 * HUD Component for Court Sq-Bound
 * Authentic NYC subway graphic aesthetic: reticle with flag progress ring,
 * dynamic MTA route bullet, car consist position, gangway door prompt,
 * Polaroid camera & album buttons, PA banner, and subtitles.
 *
 * No backdrop-filter blur here: these panels sit over the live 3D view, and a blur behind each
 * one is recomputed every frame (it roughly halved the frame rate in profiling). Slightly more
 * opaque backgrounds keep them readable instead. Short-lived dialogs may still blur.
 */
import React from 'react';
import { GameEngine } from '../game/gameState';
import { STOPS, TIER_NAMES, CFG } from '../constants';
import { Volume2, VolumeX, Pause, Camera, Image as ImageIcon, DoorOpen, GitBranch, Mic, Maximize2, Minimize2 } from 'lucide-react';
import { fullscreenSupported, toggleFullscreen, useFullscreen } from '../ui/fullscreen';
import { HeartbeatTrace } from './HeartbeatTrace';
import { MoveStick } from './MoveStick';
import { routeManager } from '../game/routeManager';
import { polaroidManager } from '../game/polaroidManager';
import { evp } from '../game/evpManager';
import { EvpRecorder } from './EvpRecorder';
import { AnalogRollsign } from './AnalogRollsign';

interface HUDProps {
  engine: GameEngine;
  onPause: () => void;
  onToggleMute: () => void;
  isMuted: boolean;
  onFlagDown: () => void;
  onFlagUp: () => void;
  onToggleCamera?: () => void;
  onToggleAlbum?: () => void;
  onOpenRouteSelector?: () => void;
}

export const HUD: React.FC<HUDProps> = ({
  engine,
  onPause,
  onToggleMute,
  isMuted,
  onFlagDown,
  onFlagUp,
  onToggleCamera,
  onToggleAlbum,
  onOpenRouteSelector,
}) => {
  const full = useFullscreen();
  const canFull = fullscreenSupported();
  const G = engine;
  if (G.phase === 'menu' || G.phase === 'end') return null;

  const currentRoute = routeManager.activeRoute;
  const nextStopName = G.seg
    ? G.seg.b
      ? routeManager.getStopName(6)
      : routeManager.getStopName(G.seg.stop)
    : routeManager.getStopName(2);

  const isRestraint = !!G.restraint;
  const isTrial = G.phase === 'trial';

  // Flag hold progress ring calculation
  const flagProgRatio = Math.max(0, Math.min(1, G.flagLock ? 1 : G.flagProg / CFG.flagHold));
  const dashOffset = 88 * (1 - flagProgRatio);
  const isNoted = G.GT - G.notedT < 0.6;

  // Choice options
  const choice = G.choice;
  const showChoices = !!choice;

  const b = G.getBand(G.bandStop);

  // Consist Car Label
  const carName =
    G.isCrossingGangway
      ? 'GANGWAY COUPLING'
      : G.currentCarIndex === 0
      ? 'CAR 1 (LEAD)'
      : G.currentCarIndex === 2
      ? 'CAR 3 (REAR)'
      : 'CAR 2 (MID)';

  return (
    <div
      className="fixed pointer-events-none select-none z-20"
      // Inside the safe area: in full screen (or from the home screen) the view runs under notches.
      style={{
        top: 'env(safe-area-inset-top, 0px)',
        right: 'env(safe-area-inset-right, 0px)',
        bottom: 'env(safe-area-inset-bottom, 0px)',
        left: 'env(safe-area-inset-left, 0px)',
      }}
    >
      {/* Chapter Transition Rollsign */}
      <AnalogRollsign engine={G} />

      {/* Central Reticle */}
      {!isTrial && !polaroidManager.isViewfinderOpen && (
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
              stroke={isNoted ? '#ffffff' : currentRoute.bulletColor}
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeDasharray="88"
              style={{ strokeDashoffset: `${dashOffset}` }}
            />
          </svg>
          <div className="absolute left-1/2 top-1/2 w-1.5 h-1.5 -ml-[3px] -mt-[3px] rounded-full bg-[#ece6d3]/80" />
        </div>
      )}

      {/* Top bar. The left group (route, next stop) shrinks first, truncating the station name; on
          a screen too narrow for both groups the buttons drop to a second row instead of covering
          it. Hidden under the camera viewfinder, which has its own controls along the top. */}
      {!polaroidManager.isViewfinderOpen && (
      <div className="absolute inset-x-3 sm:inset-x-4 top-3 sm:top-4 flex flex-wrap items-start gap-2 pointer-events-none">
      {/* Top Left Bar: Route Bullet, Next Station, Consist Location */}
      <div className="flex-1 min-w-[8rem] flex items-center gap-2 pointer-events-auto">
        <button
          type="button"
          onClick={onOpenRouteSelector}
          title="Switch route line (L)"
          aria-label={`${currentRoute.id} train, next stop ${nextStopName}. Switch route line`}
          aria-keyshortcuts="L"
          data-testid="hud-route-panel"
          className="min-w-0 h-10 flex items-center gap-2 px-2.5 sm:px-3 rounded bg-black/80 border border-white/10 hover:border-white/30 text-xs sm:text-sm cursor-pointer transition-colors transit-sign-flicker-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ece6d3]"
        >
          <span
            className="w-6 h-6 shrink-0 rounded-full font-extrabold flex items-center justify-center text-xs shadow"
            style={{ backgroundColor: currentRoute.bulletColor, color: currentRoute.bulletTextColor }}
          >
            {currentRoute.id}
          </span>
          <span className="hidden sm:inline shrink-0 text-[#9a9684]">Next:</span>
          <b className="min-w-0 truncate text-[#ece6d3] font-bold tracking-tight">{nextStopName}</b>
          <span className="hidden sm:flex shrink-0 items-center gap-2">
            <span className="w-px h-4 bg-white/15" aria-hidden="true" />
            <HeartbeatTrace engine={G} />
          </span>
        </button>

        {/* Chapter badge (wide screens; on phones the top bar is full and the rollsign carries it) */}
        <div
          data-testid="chapter-badge"
          className="hidden xl:flex shrink-0 items-center px-2.5 py-1.5 rounded bg-black/70 border border-white/10 text-[11px] font-mono text-[#ece6d3]/80"
        >
          CH. {['I', 'II', 'III'][G.currentChapter.index - 1]} //{' '}
          {routeManager.routeId !== 'G' && G.currentChapter.titleOffG ? G.currentChapter.titleOffG : G.currentChapter.title}
        </div>

        {/* Consist Car Badge */}
        <div className="hidden lg:flex shrink-0 items-center gap-1.5 px-2.5 py-1.5 rounded bg-black/70 border border-white/10 text-[11px] font-mono text-[#ece6d3]/80">
          <span className="w-1.5 h-1.5 rounded-full bg-[#6cbe45]" />
          <span>{carName}</span>
        </div>
      </div>

      {/* Top Right Controls: Camera, Album, Mute and Pause. Labels and key hints only on wide
          screens (key hints only with a mouse); icons alone keep one row on a phone. */}
      <div className="ml-auto shrink-0 flex items-center gap-1.5 sm:gap-2 pointer-events-auto">
        {/* Polaroid Camera Viewfinder Trigger Button */}
        <button
          onClick={onToggleCamera}
          title="Equip Polaroid Camera [C]"
          aria-label="Polaroid Camera"
          className={`h-10 min-w-10 px-2.5 lg:px-3 flex items-center justify-center gap-1.5 rounded-full border text-xs font-semibold transition-all active:scale-95 ${
            polaroidManager.isViewfinderOpen
              ? 'bg-red-600 text-white border-red-400'
              : 'bg-black/70 border-white/15 text-[#ece6d3] hover:bg-black/80'
          }`}
        >
          <Camera className="w-4 h-4 text-[#e3a83a]" />
          <span className="hidden lg:inline">Camera</span>
          <span className="text-[10px] opacity-60 bg-white/10 px-1 py-0.5 rounded font-mono hidden lg:pointer-fine:inline">
            C
          </span>
        </button>

        {/* Dad's tape recorder (once he's given it to you) */}
        {evp.hasRecorder && (
          <button
            onClick={() => G.toggleRecorder()}
            title="Tape recorder [R]"
            aria-label="Recorder"
            aria-pressed={evp.raised}
            className={`h-10 min-w-10 px-2.5 lg:px-3 flex items-center justify-center gap-1.5 rounded-full border text-xs font-semibold transition-all active:scale-95 ${
              evp.raised ? 'bg-[#5a2a24] text-white border-red-400/60' : 'bg-black/70 border-white/15 text-[#ece6d3] hover:bg-black/80'
            }`}
          >
            <Mic className="w-4 h-4 text-[#e8a49a]" />
            <span className="hidden lg:inline">Recorder</span>
            <span className="text-[10px] opacity-60 bg-white/10 px-1 py-0.5 rounded font-mono hidden lg:pointer-fine:inline">R</span>
          </button>
        )}

        {/* Polaroid Evidence Album Trigger Button */}
        <button
          onClick={onToggleAlbum}
          title="Evidence Album [TAB]"
          aria-label="Evidence Album"
          className={`h-10 min-w-10 px-2.5 lg:px-3 flex items-center justify-center gap-1.5 rounded-full border text-xs font-semibold transition-all active:scale-95 ${
            polaroidManager.isAlbumOpen
              ? 'bg-amber-600 text-white border-amber-400'
              : 'bg-black/70 border-white/15 text-[#ece6d3] hover:bg-black/80'
          }`}
        >
          <ImageIcon className="w-4 h-4 text-[#6cbe45]" />
          <span className="hidden lg:inline">Album</span>
          <span className="text-[10px] text-white/50 bg-white/10 px-1 py-0.5 rounded font-mono">
            {polaroidManager.photos.length}
          </span>
        </button>

        {/* Route Selector Button */}
        <button
          onClick={onOpenRouteSelector}
          title="Route lines (L)"
          aria-label="Route Lines"
          aria-keyshortcuts="L"
          // On a narrow screen the route panel (left) opens the same selector.
          className="hidden sm:flex w-10 h-10 items-center justify-center rounded-full border border-white/15 bg-black/70 text-[#ece6d3] hover:bg-black/80 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ece6d3]"
        >
          <GitBranch className="w-4 h-4 text-[#9a9684]" />
        </button>

        {/* Mute Button */}
        <button
          onClick={onToggleMute}
          aria-label={isMuted ? 'Unmute' : 'Mute'}
          className={`h-10 min-w-10 px-2.5 lg:px-3 flex items-center justify-center gap-1.5 rounded-full border border-white/15 bg-black/70 text-xs font-semibold transition-colors hover:bg-black/80 ${
            isMuted ? 'text-[#e3a83a] border-[#e3a83a]/40' : 'text-[#ece6d3]'
          }`}
        >
          {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          <span className="hidden lg:inline">{isMuted ? 'Muted' : 'Sound'}</span>
        </button>

        {/* Full screen (wide screens; phones go full screen on boarding, or from the pause menu) */}
        {canFull && (
          <button
            onClick={toggleFullscreen}
            aria-label={full ? 'Exit full screen' : 'Full screen'}
            title={full ? 'Exit full screen' : 'Full screen'}
            className="hidden lg:flex w-10 h-10 items-center justify-center rounded-full border border-white/15 bg-black/70 text-[#ece6d3] hover:bg-black/80 transition-colors"
          >
            {full ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        )}

        {/* Pause Button */}
        <button
          onClick={onPause}
          aria-label="Pause"
          className="w-10 h-10 flex items-center justify-center rounded-full border border-white/15 bg-black/70 text-[#ece6d3] hover:bg-black/80 transition-colors"
        >
          <Pause className="w-4 h-4" />
        </button>
      </div>
      </div>
      )}

      {/* Inter-Car Gangway Door Open Prompt */}
      {G.nearGangwayDoor && (
        <div className="absolute left-1/2 top-44 -translate-x-1/2 pointer-events-auto">
          <button
            onClick={() => G.interactGangwayDoor()}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-black/85 border border-[#6cbe45] text-[#ece6d3] font-bold text-xs sm:text-sm tracking-wide shadow-2xl hover:bg-black transition-all active:scale-95 animate-bounce"
          >
            <DoorOpen className="w-4 h-4 text-[#6cbe45]" />
            <span>PUSH GANGWAY DOOR</span>
            <span className="text-[10px] bg-[#6cbe45]/30 text-[#6cbe45] px-1.5 py-0.5 rounded font-mono">
              [E]
            </span>
          </button>
        </div>
      )}

      {/* Subway PA Announcement LED Display */}
      {G.paText && (
        <div className="absolute left-1/2 top-16 -translate-x-1/2 max-w-[min(90vw,640px)] px-4 py-2 rounded bg-[#120d05] border border-[#e3a83a]/60 text-[#e3a83a] text-center font-bold text-sm sm:text-base tracking-wide shadow-[0_0_18px_rgba(227,168,58,0.25)] transit-sign-flicker relative overflow-hidden">
          <div className="absolute inset-0 pointer-events-none transit-sign-raster opacity-30" />
          <span className="inline-block w-2 h-2 rounded-full bg-[#e3a83a] mr-2 animate-ping" />
          <span className="relative z-10">{G.paText}</span>
        </div>
      )}

      {/* Contextual Hint */}
      {G.hintText && G.GT < G.hintUntil && (
        <div className="absolute left-1/2 top-28 -translate-x-1/2 max-w-[90vw] px-3.5 py-1.5 rounded bg-black/80 border border-white/10 text-[#ece6d3] text-xs sm:text-sm text-center shadow-md transit-sign-flicker-subtle">
          {G.hintText}
        </div>
      )}

      {/* Subtitles (Conversations, Parent Reactions) */}
      {G.subHtml && (
        <div
          className={`absolute left-1/2 -translate-x-1/2 max-w-[min(92vw,680px)] px-4 py-2.5 rounded bg-black/80 border border-white/10 text-center text-sm sm:text-base text-[#ece6d3] leading-relaxed shadow-lg transit-sign-flicker-subtle transition-all duration-300 ${
            showChoices ? 'bottom-28' : isRestraint ? 'bottom-32' : 'bottom-16'
          }`}
          dangerouslySetInnerHTML={{ __html: G.subHtml }}
        />
      )}

      {/* Choice Buttons Bar (Doors & Mask Checks) */}
      {showChoices && choice && (
        <div className="absolute left-1/2 bottom-5 -translate-x-1/2 w-[min(calc(100%-24px),760px)] flex flex-wrap gap-2.5 pointer-events-auto p-2 rounded-lg bg-black/85 border border-white/15 shadow-2xl transit-sign-flicker">
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
              <span className="w-6 h-6 rounded bg-black/70 border border-white/20 text-[#9a9684] flex items-center justify-center text-xs font-mono font-bold">
                {idx + 1}
              </span>
              <span className="flex-1 font-medium">{item.txt}</span>
            </button>
          ))}
        </div>
      )}

      {/* Touch: walking stick (bottom left), where the keyboard hints sit on desktop. Hidden at
          the same times WASD is ignored: answer prompts and the restraint. The camera viewfinder
          covers the screen edges, so the touch controls step aside while it's up. */}
      {G.isTouch &&
        !showChoices &&
        !polaroidManager.isViewfinderOpen &&
        !isRestraint &&
        !G.paused &&
        (G.phase === 'ride' || G.phase === 'stop' || G.phase === 'haven' || G.phase === 'intro') && (
          <MoveStick engine={G} />
        )}

      {/* Bottom Controls / Key Hints Bar (Left) — keyboard only */}
      {!G.isTouch && (
      <div className="absolute left-4 bottom-5 hidden md:flex items-center gap-2 pointer-events-none text-[11px] text-[#9a9684] font-mono bg-black/70 px-3 py-1.5 rounded border border-white/10">
        <span>[W][A][S][D] WALK</span>
        <span className="text-white/30">•</span>
        <span>[C] CAMERA</span>
        <span className="text-white/30">•</span>
        <span>[TAB] ALBUM</span>
        <span className="text-white/30">•</span>
        <span>[E] GANGWAY DOOR</span>
      </div>
      )}

      {/* The recorder takes the Flag button's place while it's up (hands busy). */}
      {evp.raised && !showChoices && <EvpRecorder engine={G} />}

      {/* Hold / Flag Button (Bottom Right) */}
      {!showChoices && !evp.raised && !(G.isTouch && polaroidManager.isViewfinderOpen) && (
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
          <div>Line: {currentRoute.name} [{currentRoute.id}]</div>
          <div>Car: {carName} | Pos: ({G.eyePos.x.toFixed(1)}, {G.eyePos.z.toFixed(1)})</div>
          <div>Sanity: {G.san.toFixed(0)} (Band: {b[0]}–{b[1]}) | Tier: {TIER_NAMES[G.tier]}</div>
          <div>Suspicion: {G.sus} (Peak: {G.peak})</div>
          <div>Gaze: {G.gazeTid || '—'} ({G.dwell.toFixed(1)}s)</div>
          <div>Photos: {polaroidManager.photos.length} prints ({polaroidManager.remainingFilm} film left)</div>
          <div>Active Anomalies: {G.active.filter(a => a.at !== null).length} / {G.active.length}</div>
        </div>
      )}
    </div>
  );
};
