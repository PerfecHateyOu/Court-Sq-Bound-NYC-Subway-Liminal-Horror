/**
 * Modal panels hold keyboard focus. When one opens, focus moves into it; Tab and Shift+Tab cycle
 * inside the topmost one, never reaching the HUD or menu hidden behind it; closing it hands focus
 * back to whatever opened it. Like ui/escape.ts, panels register while they're open and the most
 * recent one wins.
 */
import { useEffect, useState, type RefObject } from 'react';

const FOCUSABLE =
  'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])';

const stack: Array<RefObject<HTMLElement | null>> = [];
let installed = false;

function focusables(root: HTMLElement): HTMLElement[] {
  return [...root.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((el) => el.getClientRects().length > 0);
}

function onKeyDown(e: KeyboardEvent) {
  if (e.key !== 'Tab' || !stack.length) return;
  const root = stack[stack.length - 1].current;
  if (!root) return;
  const items = focusables(root);
  if (!items.length) return;
  const first = items[0];
  const last = items[items.length - 1];
  const active = document.activeElement;
  if (!root.contains(active)) {
    e.preventDefault();
    (e.shiftKey ? last : first).focus();
  } else if (e.shiftKey && active === first) {
    e.preventDefault();
    last.focus();
  } else if (!e.shiftKey && active === last) {
    e.preventDefault();
    first.focus();
  }
}

/**
 * Keeps focus inside `ref` while mounted. Focus starts on `initial()` (or the first control),
 * unless something inside already took it (autoFocus).
 */
export function useFocusTrap(ref: RefObject<HTMLElement | null>, initial?: () => HTMLElement | null) {
  // Read during render: by the time effects run, an autoFocus child has already moved focus.
  const [opener] = useState(() => document.activeElement as HTMLElement | null);
  useEffect(() => {
    if (!installed) {
      window.addEventListener('keydown', onKeyDown, true);
      installed = true;
    }
    stack.push(ref);
    const root = ref.current;
    if (root && !root.contains(document.activeElement)) {
      (initial?.() ?? focusables(root)[0])?.focus();
    }
    return () => {
      const i = stack.lastIndexOf(ref);
      if (i >= 0) stack.splice(i, 1);
      if (opener?.isConnected && opener !== document.body) opener.focus();
    };
  }, []);
}
