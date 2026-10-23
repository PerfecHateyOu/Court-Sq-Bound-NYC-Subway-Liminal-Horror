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
        ? 'bg-warn text-film-ink border-warn'
        : 'bg-black/40 text-film-2 border-[#4a4438] hover:border-faint'
      : playing
        ? 'bg-paper-ink text-cream border-paper-ink'
        : 'bg-transparent text-paper-ink border-paper-ink/50 hover:border-paper-ink';
  return (
    <button
      type="button"
      onClick={() => (playing ? engine.stopTape() : engine.playTape(tape.signalId))}
      aria-label={playing ? `Stop tape: ${tape.title}` : `Play tape: ${tape.title}`}
      aria-pressed={playing}
      className={`shrink-0 inline-flex items-center gap-1 px-2 py-1 rounded border font-mono text-3xs font-bold tracking-wider ${look}`}
    >
      {playing ? <Square className="w-3 h-3" /> : <Play className="w-3 h-3" />}
      {playing ? 'STOP' : 'PLAY'}
    </button>
  );
};
