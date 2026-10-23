/**
 * Pause Screen Overlay for LAST LOCAL
 */
import React from 'react';
import { Play, RotateCcw, Settings as SettingsIcon, Maximize2, Minimize2 } from 'lucide-react';
import { fullscreenSupported, isStandalone, toggleFullscreen, useFullscreen } from '../ui/fullscreen';
import { routeManager } from '../game/routeManager';
import { chapterOrigin } from '../game/practice';
import { GameEngine } from '../game/gameState';
import { useEscape } from '../ui/escape';
import { Overlay } from '../ui/Overlay';

interface PauseScreenProps {
  engine: GameEngine;
  onResume: () => void;
  onRestart: () => void;
  onOpenSettings: () => void;
}

export const PauseScreen: React.FC<PauseScreenProps> = ({ engine, onResume, onRestart, onOpenSettings }) => {
  const route = routeManager.activeRoute;
  const nextStop = routeManager.getStopName(engine.seg ? engine.seg.stop : 2);
  // The strip shows the line's name without its leading bullet letter.
  const lineName = route.name.replace(/^\S+\s+/, '');
  // A restart begins this ride's chapter again, back on the G (see GameEngine.startIntro),
  // whichever line you're on now.
  const origin = chapterOrigin(engine.startChapter);
  const restartOrigin = route.id === 'G' ? origin : `the G at ${origin}`;
  // Restarting throws away the current ride, so it takes a second, explicit click.
  const [confirmRestart, setConfirmRestart] = React.useState(false);
  const full = useFullscreen();
  const canFull = fullscreenSupported();
  // iPhone Safari can't go full screen from a page; the home-screen app can.
  const showHomeScreenTip = !canFull && engine.isTouch && !isStandalone();
  // Esc on the confirmation cancels it (rather than resuming the ride).
  useEscape(() => setConfirmRestart(false), confirmRestart);
  // Keys go to the menu, starting on Resume, not to the HUD behind it.
  const resumeRef = React.useRef<HTMLButtonElement>(null);

  return (
    // Esc and P resume through the game's own key handler (it also re-captures the mouse), and
    // a stray click outside shouldn't throw you back into the ride: neither closes it here.
    <Overlay
      onClose={onResume}
      labelledBy="pause-title"
      width="sm"
      layer={30}
      escape={false}
      backdropClose={false}
      initialFocus={() => resumeRef.current}
      panelClassName="bg-panel border border-white/20 text-center transit-sign-flicker"
      bodyClassName="p-5 sm:p-6"
      testId="pause-panel"
    >
        {/* Subtle illuminated transit sign raster scanlines */}
        <div className="absolute inset-0 pointer-events-none transit-sign-raster opacity-40" />

        {/* Top MTA-style route strip */}
        <div
          data-testid="pause-line"
          className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-2xs font-mono font-bold tracking-wider uppercase mb-2"
          style={{ color: route.bulletColor, backgroundColor: `${route.bulletColor}26`, borderColor: `${route.bulletColor}4d` }}
        >
          <span className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: route.bulletColor }} />
          {lineName}
        </div>

        <h2 id="pause-title" className="text-fluid-2xl font-black text-cream uppercase tracking-wide transit-sign-header drop-shadow-md">
          Train Paused
        </h2>
        {engine.nightmare && (
          <p className="mt-1 font-mono text-2xs font-bold tracking-[0.2em] text-bad-hi">NIGHTMARE MODE</p>
        )}
        {engine.isPractice && (
          <p className="mt-1 font-mono text-2xs font-bold tracking-[0.2em] text-warn">
            PRACTICE RUN: NOTHING IS SAVED
          </p>
        )}
        <p data-testid="pause-next-stop" className="mt-2 text-sm text-dim">
          Next approaching station:{' '}
          <span className="text-cream font-bold inline-flex items-center gap-1">
            <span
              className="w-4 h-4 rounded-full text-3xs font-extrabold inline-flex items-center justify-center font-sans"
              style={{ backgroundColor: route.bulletColor, color: route.bulletTextColor }}
            >
              {route.id}
            </span>
            {nextStop}
          </span>
        </p>

        <div className="mt-6 flex flex-col gap-2.5 relative z-10">
          <button
            ref={resumeRef}
            onClick={onResume}
            className="w-full py-3 px-6 rounded bg-g-line hover:bg-g-line-hi text-g-line-ink font-extrabold text-base tracking-wide transition-all shadow-lg hover:shadow-[0_0_15px_rgba(108,190,69,0.35)] active:scale-95 flex items-center justify-center gap-2"
          >
            <Play className="w-4 h-4 fill-current" />
            Resume Ride
          </button>

          <button
            onClick={onOpenSettings}
            className="w-full py-3 px-6 rounded border border-white/20 hover:border-white/40 bg-transparent text-cream font-bold text-base tracking-wide transition-all hover:bg-white/5 active:scale-95 flex items-center justify-center gap-2"
          >
            <SettingsIcon className="w-4 h-4" />
            Settings
          </button>

          {canFull && (
            <button
              onClick={toggleFullscreen}
              className="w-full py-3 px-6 rounded border border-white/20 hover:border-white/40 bg-transparent text-cream font-bold text-base tracking-wide transition-all hover:bg-white/5 active:scale-95 flex items-center justify-center gap-2"
            >
              {full ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              {full ? 'Exit Full Screen' : 'Full Screen'}
            </button>
          )}
          {showHomeScreenTip && (
            <p data-testid="home-screen-tip" className="text-xs text-dim leading-snug text-center px-2">
              To play full screen on iPhone: tap Share, then <strong className="text-cream">Add to Home Screen</strong>, and open the game from there.
            </p>
          )}

          {!confirmRestart ? (
            <button
              onClick={() => setConfirmRestart(true)}
              className="w-full py-3 px-6 rounded border border-white/20 hover:border-white/40 bg-transparent text-cream font-bold text-base tracking-wide transition-all hover:bg-white/5 active:scale-95 flex items-center justify-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              Restart Ride
            </button>
          ) : (
            <div
              role="alertdialog"
              aria-labelledby="restart-confirm-text"
              className="w-full p-3 rounded border border-warn/50 bg-warn/10 text-left transit-sign-flicker shadow-[0_0_15px_rgba(227,168,58,0.15)]"
            >
              <p id="restart-confirm-text" className="text-sm text-cream leading-snug">
                Start over from {restartOrigin}? This ride won't be saved to your history.
              </p>
              <div className="mt-3 flex gap-2">
                <button
                  autoFocus
                  onClick={onRestart}
                  className="flex-1 py-2.5 px-4 rounded bg-warn hover:bg-warn-hi text-[#1a1205] font-extrabold text-sm transition-all active:scale-95 shadow-md"
                >
                  Restart
                </button>
                <button
                  onClick={() => setConfirmRestart(false)}
                  className="flex-1 py-2.5 px-4 rounded border border-white/20 hover:border-white/40 text-cream font-bold text-sm transition-all active:scale-95"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
    </Overlay>
  );
};
