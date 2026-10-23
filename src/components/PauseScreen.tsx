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

/** Settings and Full Screen: the secondary actions, outlined. */
const SECONDARY =
  'w-full py-3 short-land:py-2.5 px-6 rounded border border-white/20 hover:border-white/40 bg-transparent hover:bg-white/5 active:translate-y-px text-cream font-bold text-base tracking-wide transition-colors flex items-center justify-center gap-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cream';

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
  // Restarting throws away the current ride, so it takes a second, explicit click (not in a
  // practice run: nothing in it is saved).
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

        {/* The line, the title and the next stop. In short landscape (a phone on its side) the line
            and the next stop share one row above a smaller title, so all four buttons fit. */}
        <div className="flex flex-col items-center short-land:flex-row short-land:flex-wrap short-land:justify-center short-land:gap-x-2">
          <div
            data-testid="pause-line"
            className="order-1 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-2xs font-mono font-bold tracking-wider uppercase mb-2 short-land:mb-0"
            style={{ color: route.bulletColor, backgroundColor: `${route.bulletColor}26`, borderColor: `${route.bulletColor}4d` }}
          >
            <span className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: route.bulletColor }} />
            {lineName}
          </div>
          <h2
            id="pause-title"
            className="order-2 short-land:order-3 short-land:basis-full short-land:mt-1 text-fluid-2xl short-land:text-lg font-black text-cream uppercase tracking-wide transit-sign-header drop-shadow-md"
          >
            Train Paused
          </h2>
          <p data-testid="pause-next-stop" className="order-3 short-land:order-2 mt-2 short-land:mt-0 text-sm text-dim">
            <span className="short-land:hidden">Next approaching station: </span>
            <span className="hidden short-land:inline">Next: </span>
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
        </div>
        {engine.nightmare && (
          <p className="mt-1 font-mono text-2xs font-bold tracking-[0.2em] text-bad-hi">NIGHTMARE MODE</p>
        )}
        {engine.isPractice && (
          <p className="mt-1 font-mono text-2xs font-bold tracking-[0.2em] text-warn">
            PRACTICE RUN: NOTHING IS SAVED
          </p>
        )}

        <div className="mt-5 short-land:mt-3 grid grid-cols-1 short-land:grid-cols-2 gap-2.5 short-land:gap-2 relative z-10">
          <button
            ref={resumeRef}
            onClick={onResume}
            className="w-full py-3 short-land:py-2.5 px-6 rounded bg-g-line hover:bg-g-line-hi text-g-line-ink font-extrabold text-base tracking-wide transition-all shadow-lg hover:shadow-[0_0_15px_rgba(108,190,69,0.35)] active:translate-y-px focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cream flex items-center justify-center gap-2"
          >
            <Play className="w-4 h-4 fill-current" />
            Resume Ride
          </button>

          <button onClick={onOpenSettings} className={SECONDARY}>
            <SettingsIcon className="w-4 h-4" />
            Settings
          </button>

          {canFull && (
            <button onClick={toggleFullscreen} className={SECONDARY}>
              {full ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              {full ? 'Exit Full Screen' : 'Full Screen'}
            </button>
          )}
          {showHomeScreenTip && (
            <p data-testid="home-screen-tip" className="text-xs text-dim leading-snug text-center px-2 short-land:col-span-2">
              To play full screen on iPhone: tap Share, then <strong className="text-cream">Add to Home Screen</strong>, and open the game from there.
            </p>
          )}

          {/* Destructive, so set apart: a red ghost button at the bottom, with a confirm step. */}
          {!confirmRestart ? (
            <button
              onClick={() => (engine.isPractice ? onRestart() : setConfirmRestart(true))}
              className="w-full mt-2 pt-3 short-land:mt-0 short-land:pt-2.5 py-2.5 px-6 rounded border border-transparent hover:border-bad/60 hover:bg-bad/10 active:translate-y-px text-bad-hi font-bold text-sm tracking-wide transition-colors flex items-center justify-center gap-2 relative before:absolute before:-top-1 before:left-4 before:right-4 before:border-t before:border-white/10 short-land:before:hidden focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bad-hi"
            >
              <RotateCcw className="w-4 h-4" />
              Restart Ride
            </button>
          ) : (
            <div
              role="alertdialog"
              aria-labelledby="restart-confirm-text"
              className="w-full p-3 rounded border border-bad/50 bg-bad/10 text-left short-land:col-span-2"
            >
              <p id="restart-confirm-text" className="text-sm text-cream leading-snug">
                Start over from {restartOrigin}? This ride won't be saved to your history.
              </p>
              <div className="mt-3 flex gap-2">
                <button
                  autoFocus
                  onClick={onRestart}
                  className="flex-1 py-2.5 px-4 rounded bg-bad hover:bg-bad-hi text-white font-extrabold text-sm transition-colors active:translate-y-px shadow-md"
                >
                  Restart
                </button>
                <button
                  onClick={() => setConfirmRestart(false)}
                  className="flex-1 py-2.5 px-4 rounded border border-white/20 hover:border-white/40 text-cream font-bold text-sm transition-colors active:translate-y-px"
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
