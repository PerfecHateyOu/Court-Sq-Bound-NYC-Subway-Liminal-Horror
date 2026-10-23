/**
 * One status chip for evidence, the same in the Case Files (paper) and the Evidence Log (dark):
 * one color per state, and the state is always spelled out, never shown by color alone.
 *
 *   caught      a developed print with an anomaly in it   (red, like a stamp)
 *   documented  an anomaly you flagged or photographed     (G-line green)
 *   unconfirmed seen, but not caught in time               (amber)
 *   nothing     a developed print with nothing in it       (neutral)
 */
import React from 'react';

export type EvidenceState = 'caught' | 'documented' | 'unconfirmed' | 'nothing';

const LABEL: Record<EvidenceState, string> = {
  caught: 'CAUGHT',
  documented: 'DOCUMENTED',
  unconfirmed: 'UNCONFIRMED',
  nothing: 'NOTHING',
};

const TONE: Record<'paper' | 'dark', Record<EvidenceState, string>> = {
  paper: {
    caught: 'bg-paper-red text-white',
    documented: 'bg-g-line/30 text-g-deep',
    unconfirmed: 'bg-warn/30 text-[#6d4b0f]',
    nothing: 'bg-black/10 text-paper-dim',
  },
  dark: {
    caught: 'bg-bad text-white',
    documented: 'bg-g-line/25 text-g-line-hi',
    unconfirmed: 'bg-warn/25 text-warn-hi',
    nothing: 'bg-black/60 text-cream/80',
  },
};

export const StatusChip: React.FC<{ state: EvidenceState; tone?: 'paper' | 'dark'; className?: string }> = ({
  state,
  tone = 'paper',
  className = '',
}) => (
  <span className={`inline-block px-1.5 py-0.5 rounded-sm font-mono text-3xs font-bold tracking-wider ${TONE[tone][state]} ${className}`}>
    {LABEL[state]}
  </span>
);
