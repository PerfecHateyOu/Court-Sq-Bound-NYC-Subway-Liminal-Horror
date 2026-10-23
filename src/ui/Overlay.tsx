/**
 * The one modal shell every panel uses (Settings, Pause, Case Files, Evidence Log, Route lines).
 *
 *  - Never taller than the screen: `header` and `footer` stay put, only the body scrolls.
 *  - Phones held upright with a touch screen get a bottom sheet (thumb reach); everything else
 *    gets a centered card. Notches and the home indicator are kept clear either way.
 *  - role="dialog" + aria-modal, labelled by the caller's title id. Focus moves in, Tab stays in,
 *    and closing hands focus back to whatever opened it (ui/focus.ts). Esc closes the topmost
 *    panel (ui/escape.ts) unless `escape` is false (Pause leaves Esc to the game's own resume).
 *  - Rendered into <body>, so a blurred or scrolled screen behind it can't shift it.
 *  - A 180ms fade-and-rise in (a slide up for the sheet), none under Reduced screen effects.
 */
import React, { useRef } from 'react';
import { createPortal } from 'react-dom';
import { useEscape } from './escape';
import { useFocusTrap } from './focus';

const WIDTH = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
  '4xl': 'max-w-4xl',
} as const;

const LAYER = { 30: 'z-30', 40: 'z-40', 50: 'z-50', 60: 'z-60' } as const;

export interface OverlayProps {
  /** Closes the panel: the backdrop, Esc (unless `escape` is false) and the caller's own buttons. */
  onClose: () => void;
  /** id of the panel's visible title. */
  labelledBy: string;
  header?: React.ReactNode;
  footer?: React.ReactNode;
  children: React.ReactNode;
  width?: keyof typeof WIDTH;
  layer?: keyof typeof LAYER;
  /** Panel surface; defaults to the dark car UI. */
  panelClassName?: string;
  bodyClassName?: string;
  /** The backdrop's tint. */
  backdropClassName?: string;
  /** Where focus starts (defaults to an autoFocus child, else the first control). */
  initialFocus?: () => HTMLElement | null;
  /** Esc closes it (default). */
  escape?: boolean;
  /** A click on the backdrop closes it (default). */
  backdropClose?: boolean;
  /** Bottom sheet on touch phones held upright (default). */
  sheet?: boolean;
  role?: 'dialog' | 'alertdialog';
  testId?: string;
}

export const Overlay: React.FC<OverlayProps> = ({
  onClose,
  labelledBy,
  header,
  footer,
  children,
  width = 'md',
  layer = 40,
  panelClassName = 'bg-panel border border-white/15 text-cream',
  bodyClassName = 'px-5 py-4',
  backdropClassName = 'bg-black/80 backdrop-blur-md',
  initialFocus,
  escape = true,
  backdropClose = true,
  sheet = true,
  role = 'dialog',
  testId,
}) => {
  const panelRef = useRef<HTMLDivElement>(null);
  useEscape(onClose, escape);
  useFocusTrap(panelRef, initialFocus);

  const asSheet = sheet ? 'overlay-sheet' : '';
  return createPortal(
    <div
      className={`overlay-backdrop ${asSheet} fixed inset-0 ${LAYER[layer]} flex items-center justify-center safe-pad ${backdropClassName}`}
      onPointerDown={(e) => {
        if (backdropClose && e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        role={role}
        aria-modal="true"
        aria-labelledby={labelledBy}
        data-testid={testId}
        className={`overlay-panel relative w-full ${WIDTH[width]} max-h-full flex flex-col overflow-hidden rounded-lg shadow-2xl ${panelClassName}`}
      >
        {header && <div className="shrink-0 relative z-10">{header}</div>}
        <div className={`overlay-body relative flex-1 min-h-0 overflow-y-auto overscroll-contain ${bodyClassName}`}>{children}</div>
        {footer && <div className="shrink-0 relative z-10">{footer}</div>}
      </div>
    </div>,
    document.body
  );
};
