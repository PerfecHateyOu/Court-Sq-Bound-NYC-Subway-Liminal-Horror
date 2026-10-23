/**
 * The practice stretch's coach card (src/game/tutorial.ts): which lesson you're on, what to do,
 * Next once it's done (Enter on a keyboard, since the mouse is captured while you look), and
 * Skip practice at any time.
 *
 * It docks under the HUD's top bar (--hud-h, published by HUD.tsx), so it never covers the
 * station panel. On a phone turned sideways it's one compact row: step and title on one line,
 * the lesson in two, and the buttons to the right.
 */
import React from 'react';
import type { TutorialView } from '../game/tutorial';

interface TutorialCoachProps {
  view: TutorialView;
  isTouch: boolean;
  onNext: () => void;
  onSkip: () => void;
}

export const TutorialCoach: React.FC<TutorialCoachProps> = ({ view, isTouch, onNext, onSkip }) => {
  const last = view.step === 'ready';
  const step = last ? '' : `${view.index} of ${view.total}`;
  const skip = (
    <button
      type="button"
      onClick={onSkip}
      className="tap px-2 normal-case tracking-normal font-sans text-xs text-cream/80 hover:text-white underline underline-offset-2"
    >
      Skip practice
    </button>
  );
  const next = view.canNext && (
    <button
      type="button"
      onClick={onNext}
      className="tap px-4 rounded bg-g-line hover:bg-g-line-hi text-g-line-ink font-extrabold text-sm"
    >
      {last ? 'Start the ride' : 'Next'}
    </button>
  );
  return (
    <section
      aria-label="Practice stretch"
      data-testid="tutorial-coach"
      className="fixed left-1/2 -translate-x-1/2 top-[calc(var(--hud-h,4rem)+0.5rem)] z-20 w-[min(calc(100vw-1.5rem),28rem)] rounded border border-white/15 bg-panel/92 text-cream shadow-xl px-4 py-3 flex flex-col short-land:flex-row short-land:items-center short-land:gap-3 short-land:py-2"
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-3 text-3xs sm:text-2xs font-mono uppercase tracking-[0.18em] text-dim short-land:hidden">
          <span>Practice stretch{step ? ` · ${step}` : ''}</span>
          {!last && skip}
        </div>
        <h2 className="mt-1 short-land:mt-0 text-base sm:text-lg short-land:text-sm font-bold text-white short-land:truncate">
          <span className="hidden short-land:inline font-mono text-2xs font-normal text-dim mr-1.5">{step || 'Practice'} ·</span>
          {view.title}
        </h2>
        <p aria-live="polite" className="mt-0.5 text-sm short-land:text-xs leading-snug text-cream/90 short-land:line-clamp-2">
          {view.body}
        </p>
        {view.canNext && (
          <div className="mt-2.5 flex items-center justify-end gap-3 short-land:hidden">
            {!isTouch && <span className="text-2xs font-mono text-dim">or press Enter</span>}
            {next}
          </div>
        )}
      </div>
      <div className="hidden short-land:flex shrink-0 items-center gap-1">
        {!last && skip}
        {next}
      </div>
    </section>
  );
};
