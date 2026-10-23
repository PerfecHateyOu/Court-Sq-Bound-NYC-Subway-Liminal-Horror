/**
 * The practice stretch's coach card (src/game/tutorial.ts): which lesson you're on, what to do,
 * Next once it's done (Enter on a keyboard, since the mouse is captured while you look), and
 * Skip practice at any time.
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
  return (
    <section
      aria-label="Practice stretch"
      data-testid="tutorial-coach"
      className="fixed left-1/2 -translate-x-1/2 top-[max(4.25rem,calc(env(safe-area-inset-top)+3.75rem))] z-20 w-[min(92vw,30rem)] rounded border border-white/15 bg-panel/92 text-cream shadow-xl px-4 py-3"
    >
      <div className="flex items-center justify-between gap-3 text-3xs sm:text-2xs font-mono uppercase tracking-[0.18em] text-dim">
        <span>
          Practice stretch{last ? '' : ` · ${view.index} of ${view.total}`}
        </span>
        {!last && (
          <button
            type="button"
            onClick={onSkip}
            className="normal-case tracking-normal font-sans text-xs text-cream/80 hover:text-white underline underline-offset-2 px-1 py-0.5"
          >
            Skip practice
          </button>
        )}
      </div>
      <h2 className="mt-1 text-base sm:text-lg font-bold text-white">{view.title}</h2>
      <p aria-live="polite" className="mt-0.5 text-sm leading-snug text-cream/90">
        {view.body}
      </p>
      {view.canNext && (
        <div className="mt-2.5 flex items-center justify-end gap-3">
          {!isTouch && <span className="text-2xs font-mono text-dim">or press Enter</span>}
          <button
            type="button"
            onClick={onNext}
            className="px-4 py-1.5 rounded bg-g-line hover:bg-g-line-hi text-g-line-ink font-extrabold text-sm"
          >
            {last ? 'Start the ride' : 'Next'}
          </button>
        </div>
      )}
    </section>
  );
};
