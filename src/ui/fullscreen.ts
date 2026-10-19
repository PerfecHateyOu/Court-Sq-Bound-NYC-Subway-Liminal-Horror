/**
 * Browser full screen (hides the address bar and tabs).
 *
 * - Chrome, Edge, Firefox, Android and iPad Safari support the Fullscreen API. Entering must
 *   happen inside a click or tap, so callers invoke enterFullscreen() from the handler itself.
 * - iPhone Safari doesn't let pages go full screen. There, "Add to Home Screen" opens the game
 *   full screen instead (public/manifest.webmanifest + the apple-mobile-web-app meta tags).
 */
import { useSyncExternalStore } from 'react';

type WebkitDocument = Document & {
  webkitFullscreenEnabled?: boolean;
  webkitFullscreenElement?: Element | null;
  webkitExitFullscreen?: () => Promise<void> | void;
};
type WebkitElement = HTMLElement & {
  webkitRequestFullscreen?: (opts?: FullscreenOptions) => Promise<void> | void;
};

const doc = () => document as WebkitDocument;

/**
 * Whether going full screen is possible and would change anything. The home-screen app on
 * Android opens full screen already (display: fullscreen in the manifest), and so does a browser
 * in its own full screen (F11), but both still report the Fullscreen API as available, so a Full
 * screen button there would do nothing visible. (display-mode is fullscreen while the page itself
 * is full screen too; then fullscreenElement is set and the button is needed, to leave.)
 */
export function fullscreenSupported(): boolean {
  if (window.matchMedia?.('(display-mode: fullscreen)').matches && !isFullscreen()) return false;
  return !!(doc().fullscreenEnabled || doc().webkitFullscreenEnabled);
}

export function isFullscreen(): boolean {
  return !!(doc().fullscreenElement || doc().webkitFullscreenElement);
}

/** Opened from the home screen (already full screen, with no browser bars). */
export function isStandalone(): boolean {
  return (
    window.matchMedia?.('(display-mode: fullscreen)').matches ||
    window.matchMedia?.('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

/** Go full screen. Call from a click/tap handler. Failures (an iframe without permission, a refusal) are ignored. */
export function enterFullscreen(): void {
  if (!fullscreenSupported() || isFullscreen()) return;
  const el = document.documentElement as WebkitElement;
  try {
    const p = el.requestFullscreen ? el.requestFullscreen({ navigationUI: 'hide' }) : el.webkitRequestFullscreen?.();
    (p as Promise<void> | undefined)?.catch?.(() => {});
  } catch {
    /* not allowed here */
  }
}

/** The game's own button asked to leave full screen (so the change isn't the player escaping). */
let leavingOnRequest = false;

export function exitFullscreen(): void {
  if (!isFullscreen()) return;
  leavingOnRequest = true;
  try {
    const p = document.exitFullscreen ? document.exitFullscreen() : doc().webkitExitFullscreen?.();
    (p as Promise<void> | undefined)?.catch?.(() => {
      leavingOnRequest = false;
    });
  } catch {
    leavingOnRequest = false; /* already out */
  }
}

/**
 * Call when full screen ends: true if exitFullscreen() asked for it (a button in the game), false
 * if the browser or the player did (Esc, a swipe, the browser's own control). Clears the flag.
 */
export function leftFullscreenOnRequest(): boolean {
  const was = leavingOnRequest;
  leavingOnRequest = false;
  return was;
}

export function toggleFullscreen(): void {
  if (isFullscreen()) exitFullscreen();
  else enterFullscreen();
}

const EVENTS = ['fullscreenchange', 'webkitfullscreenchange'];

export function onFullscreenChange(fn: () => void): () => void {
  EVENTS.forEach((e) => document.addEventListener(e, fn));
  return () => EVENTS.forEach((e) => document.removeEventListener(e, fn));
}

/** Re-renders when the page enters or leaves full screen. */
export function useFullscreen(): boolean {
  return useSyncExternalStore(onFullscreenChange, isFullscreen, () => false);
}
