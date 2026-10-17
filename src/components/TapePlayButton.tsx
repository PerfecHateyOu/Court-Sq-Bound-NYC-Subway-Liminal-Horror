/** Play / Stop for one saved tape (Evidence Log and report). */
import React from 'react';
import { Play, Square } from 'lucide-react';
import type { GameEngine } from '../game/gameState';
import type { EvpTape } from '../game/evpManager';

export const TapePlayButton: React.FC<{ engine: GameEngine; tape: EvpTape; tone?: 'dark' | 'paper' }> = ({
  engine,
  tape,
  tone = 'dark',
}) => {
  const playing = engine.tapePlaying?.signalId === tape.signalId;
  const look =
    tone === 'dark'
      ? playing
        ? 'bg-[#e3a83a] text-[#15130f] border-[#e3a83a]'
        : 'bg-black/40 text-[#d9d1bd] border-[#4a4438] hover:border-[#8d8371]'
      : playing
        ? 'bg-[#1b1d18] text-[#ece6d3] border-[#1b1d18]'
        : 'bg-transparent text-[#1b1d18] border-[#1b1d18]/50 hover:border-[#1b1d18]';
  return (
    <button
      type="button"
      onClick={() => (playing ? engine.stopTape() : engine.playTape(tape.signalId))}
      aria-label={playing ? `Stop tape: ${tape.title}` : `Play tape: ${tape.title}`}
      aria-pressed={playing}
      className={`shrink-0 inline-flex items-center gap-1 px-2 py-1 rounded border font-mono text-[10px] font-bold tracking-wider ${look}`}
    >
      {playing ? <Square className="w-3 h-3" /> : <Play className="w-3 h-3" />}
      {playing ? 'STOP' : 'PLAY'}
    </button>
  );
};
