/**
 * HUD Component for LAST LOCAL
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
          <div className="absolute left-1/2 top-1/2 w-1.5 h-1.5 -ml-[3px] -mt-[3px] rounded-full bg-cream/80" />
        </div>
      )}

      {/*
        Top bar: one row, so the route panel and the controls can't overlap. The controls keep
        their size; the route panel gives way (the station name truncates last). On narrow
        (portrait) screens the route panel drops to a second row, under the controls; on the
        narrowest phones (320px) the controls close up to fit in one row. Hidden under
        the camera viewfinder, which has its own Album and Lower buttons along the top.
      */}
      <div
        className={`absolute inset-x-3 min-[360px]:inset-x-4 top-4 ${polaroidManager.isViewfinderOpen ? 'hidden' : 'flex'} flex-wrap sm:flex-nowrap items-start sm:items-center justify-end sm:justify-between gap-2 pointer-events-none`}
      >
        {/* Route Bullet, Next Station, Consist Location */}
        <div className="order-last basis-full sm:order-none sm:basis-auto min-w-0 flex items-center gap-2 *:pointer-events-auto">
          <button
            type="button"
            onClick={onOpenRouteSelector}
            title="Switch route line (L)"
            aria-label={`${currentRoute.id} train, next stop ${nextStopName}. Switch route line`}
            aria-keyshortcuts="L"
            data-testid="hud-route-panel"
            className="min-w-0 flex items-center gap-2 px-3 py-1.5 rounded bg-black/80 border border-white/10 hover:border-white/30 text-xs sm:text-sm cursor-pointer transition-colors transit-sign-flicker-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cream"
          >
            <span
              className="shrink-0 w-6 h-6 rounded-full font-extrabold flex items-center justify-center text-xs shadow"
              style={{ backgroundColor: currentRoute.bulletColor, color: currentRoute.bulletTextColor }}
            >
              {currentRoute.id}
            </span>
            <span className="hidden lg:inline font-mono text-3xs tracking-widest text-g-line uppercase font-bold">
              LAST LOCAL
            </span>
            <span className="hidden lg:inline text-dim">Next:</span>
            <b className="min-w-0 truncate text-cream font-bold tracking-tight">{nextStopName}</b>
            <span className="shrink-0 w-px h-4 bg-white/15" aria-hidden="true" />
            <HeartbeatTrace engine={G} />
          </button>

          {/* Chapter badge (wide screens; elsewhere the top bar is full and the rollsign carries it) */}
          <div
            data-testid="chapter-badge"
            className="hidden xl:flex shrink-0 items-center px-2.5 py-1.5 rounded bg-black/70 border border-white/10 text-2xs font-mono text-cream/80"
          >
            CH. {['I', 'II', 'III'][G.currentChapter.index - 1]} //{' '}
            {routeManager.routeId !== 'G' && G.currentChapter.titleOffG ? G.currentChapter.titleOffG : G.currentChapter.title}
          </div>

          {/* Consist Car Badge */}
          <div className="hidden md:flex shrink-0 items-center gap-1.5 px-2.5 py-1.5 rounded bg-black/70 border border-white/10 text-2xs font-mono text-cream/80">
            <span className="w-1.5 h-1.5 rounded-full bg-g-line" />
            <span>{carName}</span>
          </div>
        </div>

        {/* Controls: Camera, Album, Mute and Pause (icons only until there's room for labels) */}
        <div className="shrink-0 flex items-center gap-1 min-[360px]:gap-2 pointer-events-auto">
          {/* Polaroid Camera Viewfinder Trigger Button */}
          <button
            onClick={onToggleCamera}
            // While an answer or the restraint needs you, the camera can't come up; pressing it says why.
            title={G.handsBusy && !polaroidManager.isViewfinderOpen ? `Camera: ${G.handsBusy}` : 'Equip Polaroid Camera [C]'}
            aria-label="Polaroid Camera"
            aria-pressed={polaroidManager.isViewfinderOpen}
            aria-disabled={(!!G.handsBusy && !polaroidManager.isViewfinderOpen) || undefined}
            className={`h-10 px-3 flex items-center gap-1.5 rounded-full border text-xs font-semibold transition-all active:scale-95 ${
              polaroidManager.isViewfinderOpen
                ? 'bg-red-600 text-white border-red-400'
                : G.handsBusy
                ? 'bg-black/50 border-white/10 text-cream opacity-40 cursor-not-allowed'
                : 'bg-black/70 border-white/15 text-cream hover:bg-black/80'
            }`}
          >
            <Camera className="w-4 h-4 text-warn" />
            <span className="hidden xl:inline">Camera</span>
            <span className="text-3xs opacity-60 bg-white/10 px-1 py-0.5 rounded font-mono hidden xl:inline">
              C
            </span>
          </button>

          {/* Dad's tape recorder (once he's given it to you) */}
          {evp.hasRecorder && (
            <button
              onClick={() => G.toggleRecorder()}
              title={G.handsBusy && !evp.raised ? `Recorder: ${G.handsBusy}` : 'Tape recorder [R]'}
              aria-label="Recorder"
              aria-pressed={evp.raised}
              aria-disabled={(!!G.handsBusy && !evp.raised) || undefined}
              className={`h-10 px-3 flex items-center gap-1.5 rounded-full border text-xs font-semibold transition-all active:scale-95 ${
                evp.raised
                  ? 'bg-[#5a2a24] text-white border-red-400/60'
                  : G.handsBusy
                  ? 'bg-black/50 border-white/10 text-cream opacity-40 cursor-not-allowed'
                  : 'bg-black/70 border-white/15 text-cream hover:bg-black/80'
              }`}
            >
              <Mic className="w-4 h-4 text-bad-pale" />
              <span className="hidden xl:inline">Recorder</span>
              <span className="text-3xs opacity-60 bg-white/10 px-1 py-0.5 rounded font-mono hidden xl:inline">R</span>
            </button>
          )}

          {/* The evidence log (prints and tapes): one name everywhere, "Evidence" on buttons */}
          <button
            onClick={onToggleAlbum}
            title="Evidence log [Tab]"
            aria-label="Evidence Log"
            aria-pressed={polaroidManager.isAlbumOpen}
            className={`h-10 px-3 flex items-center gap-1.5 rounded-full border text-xs font-semibold transition-all active:scale-95 ${
              polaroidManager.isAlbumOpen
                ? 'bg-amber-600 text-white border-amber-400'
                : 'bg-black/70 border-white/15 text-cream hover:bg-black/80'
            }`}
          >
            <ImageIcon className="w-4 h-4 text-g-line" />
            <span className="hidden xl:inline">Evidence</span>
            <span className="text-3xs text-white/50 bg-white/10 px-1 py-0.5 rounded font-mono">
              {polaroidManager.photos.length}
            </span>
          </button>

          {/* Route Selector Button */}
          <button
            onClick={onOpenRouteSelector}
            title="Route lines (L)"
            aria-label="Route Lines"
            aria-keyshortcuts="L"
            className="w-10 h-10 flex items-center justify-center rounded-full border border-white/15 bg-black/70 text-cream hover:bg-black/80 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cream"
          >
            <GitBranch className="w-4 h-4 text-dim" />
          </button>

          {/* Mute Button */}
          <button
            onClick={onToggleMute}
            aria-label={isMuted ? 'Unmute' : 'Mute'}
            className={`h-10 px-3 flex items-center gap-1.5 rounded-full border bg-black/70 text-xs font-semibold transition-colors hover:bg-black/80 ${
              isMuted ? 'text-warn border-warn/60' : 'text-cream border-white/15'
            }`}
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            <span className="hidden xl:inline">{isMuted ? 'Muted' : 'Sound'}</span>
          </button>

          {/* Full screen (wide screens; phones go full screen on boarding, or from the pause menu) */}
          {canFull && (
            <button
              onClick={toggleFullscreen}
              aria-label={full ? 'Exit full screen' : 'Full screen'}
              title={full ? 'Exit full screen' : 'Full screen'}
              className="hidden lg:flex w-10 h-10 items-center justify-center rounded-full border border-white/15 bg-black/70 text-cream hover:bg-black/80 transition-colors"
            >
              {full ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          )}

          {/* Pause Button */}
          <button
            onClick={onPause}
            aria-label="Pause"
            className="w-10 h-10 flex items-center justify-center rounded-full border border-white/15 bg-black/70 text-cream hover:bg-black/80 transition-colors"
          >
            <Pause className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Inter-Car Gangway Door Open Prompt */}
      {G.nearGangwayDoor && (
        <div className="absolute left-1/2 top-56 sm:top-44 -translate-x-1/2 pointer-events-auto">
          <button
            onClick={() => G.interactGangwayDoor()}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-black/85 border border-g-line text-cream font-bold text-xs sm:text-sm tracking-wide shadow-2xl hover:bg-black transition-all active:scale-95 animate-bounce"
          >
            <DoorOpen className="w-4 h-4 text-g-line" />
            <span>PUSH GANGWAY DOOR</span>
            <span className="text-3xs bg-g-line/30 text-g-line px-1.5 py-0.5 rounded font-mono">
              [E]
            </span>
          </button>
        </div>
      )}

      {/* Subway PA Announcement LED Display */}
      {G.paText && (
        <div className="absolute left-1/2 top-28 sm:top-16 -translate-x-1/2 max-w-[min(90vw,640px)] px-4 py-2 rounded bg-[#120d05] border border-warn/60 text-warn text-center font-bold text-sm sm:text-base tracking-wide shadow-[0_0_18px_rgba(227,168,58,0.25)] transit-sign-flicker relative overflow-hidden">
          <div className="absolute inset-0 pointer-events-none transit-sign-raster opacity-30" />
          <span className="inline-block w-2 h-2 rounded-full bg-warn mr-2 animate-ping" />
          <span className="relative z-10">{G.paText}</span>
        </div>
      )}

      {/* Contextual Hint */}
      {G.hintText && G.GT < G.hintUntil && (
        <div className="absolute left-1/2 top-40 sm:top-28 -translate-x-1/2 max-w-[90vw] px-3.5 py-1.5 rounded bg-black/80 border border-white/10 text-cream text-xs sm:text-sm text-center shadow-md transit-sign-flicker-subtle">
          {G.hintText}
        </div>
      )}

      {/* Subtitles (Conversations, Parent Reactions) */}
      {G.subHtml && (
        <div
          className={`absolute left-1/2 -translate-x-1/2 max-w-[min(92vw,680px)] px-4 py-2.5 rounded bg-black/80 border border-white/10 text-center text-sm sm:text-base text-cream leading-relaxed shadow-lg transit-sign-flicker-subtle transition-all duration-300 ${
            showChoices ? 'bottom-28' : isRestraint ? 'bottom-32' : 'bottom-16'
          }`}
          dangerouslySetInnerHTML={{ __html: G.subHtml }}
        />
      )}

      {/* Choice Buttons Bar (Doors & Mask Checks) */}
      {showChoices && choice && (
        <div className="absolute left-1/2 bottom-5 -translate-x-1/2 w-[min(calc(100vw-32px),760px)] flex flex-wrap gap-2.5 pointer-events-auto p-2 rounded-lg bg-black/85 border border-white/15 shadow-2xl transit-sign-flicker">
          {/* Progress Time Bar */}
          {isFinite(choice.window) && (
            <div className="w-full h-1 bg-white/15 rounded-full overflow-hidden mb-1">
              <div
                className="h-full bg-warn transition-all duration-100 ease-linear"
                style={{ width: `${Math.max(0, Math.min(100, (choice.left / choice.window) * 100))}%` }}
              />
            </div>
          )}

          {choice.items.map((item, idx) => (
            <button
              key={idx}
              onClick={() => G.pickChoiceIndex(idx)}
              className="flex-1 min-w-[160px] min-h-[46px] flex items-center gap-3 px-3.5 py-2.5 rounded bg-[#151916] hover:bg-[#202722] border border-white/15 hover:border-g-line text-left text-sm sm:text-base text-cream transition-all active:scale-[0.98]"
            >
              <span className="w-6 h-6 rounded bg-black/70 border border-white/20 text-dim flex items-center justify-center text-xs font-mono font-bold">
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
      <div className="absolute left-4 bottom-5 hidden md:flex items-center gap-2 pointer-events-none text-2xs text-dim font-mono bg-black/70 px-3 py-1.5 rounded border border-white/10">
        {/* The essentials. The gangway door shows its own [E] prompt when you're at one. */}
        <span>[F] FLAG</span>
        <span className="text-white/30">•</span>
        <span>[C] CAMERA</span>
        {evp.hasRecorder && (
          <>
            <span className="text-white/30">•</span>
            <span>[R] RECORDER</span>
          </>
        )}
        <span className="text-white/30">•</span>
        <span>[TAB] EVIDENCE</span>
        <span className="text-white/30">•</span>
        <span>[WASD] WALK</span>
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
                ? 'w-24 h-24 sm:w-28 sm:h-28 bg-warn/20 hover:bg-warn/30 border-warn text-warn'
                : G.flagHeld
                ? 'w-20 h-20 sm:w-22 sm:h-22 bg-g-line/30 border-g-line text-cream'
                : 'w-20 h-20 sm:w-22 sm:h-22 bg-black/65 hover:bg-black/80 border-white/30 text-cream'
            }`}
          >
            <span className="font-extrabold tracking-wider text-xs sm:text-sm">
              {isRestraint ? 'HOLD' : 'FLAG'}
            </span>
            <small className="text-3xs text-dim font-normal">
              {isRestraint ? "don't let go" : 'hold to catch'}
            </small>
          </button>
        </div>
      )}

      {/* Spoilers Debug Overlay */}
      {G.debug && (
        <div className="absolute left-4 top-16 p-3 rounded bg-black/85 border border-g-line/40 text-g-line font-mono text-2xs leading-relaxed max-w-sm pointer-events-auto z-30">
          <div className="font-bold border-b border-white/10 pb-1 mb-1 text-white">
            DEBUG: Stop {G.seg ? `${G.seg.stop}${G.seg.b ? 'b' : ''}` : '1'} ({G.phase}) | TS: {G.ts.toFixed(1)}s
          </div>
          <div>Service: LAST LOCAL | Line: {currentRoute.name} [{currentRoute.id}]</div>
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
