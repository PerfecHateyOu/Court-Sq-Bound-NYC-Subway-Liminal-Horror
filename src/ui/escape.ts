/**
 * Esc closes whatever is on top: a confirmation before the panel it sits in, a panel before
 * the pause menu. Components register while they're open; the most recent one gets the key,
 * and the game's own Esc (pause/resume) only runs when nothing is registered.
 */
import { useEffect, useRef } from 'react';

const stack: Array<() => void> = [];
let installed = false;

function onKeyDown(e: KeyboardEvent) {
  if (e.code !== 'Escape' || !stack.length) return;
  e.preventDefault();
  e.stopImmediatePropagation(); // keep it from the game's pause toggle
  stack[stack.length - 1]();
}

/** While `active`, Esc calls `handler` (if this is the topmost registration). */
export function useEscape(handler: () => void, active = true) {
  const ref = useRef(handler);
  ref.current = handler;
  useEffect(() => {
    if (!active) return;
    if (!installed) {
      // Capture phase on window runs before the game's own keydown listener.
      window.addEventListener('keydown', onKeyDown, true);
      installed = true;
    }
    const fn = () => ref.current();
    stack.push(fn);
    return () => {
      const i = stack.lastIndexOf(fn);
      if (i >= 0) stack.splice(i, 1);
    };
  }, [active]);
}
