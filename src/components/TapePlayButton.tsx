/**
 * Microcassette Audio Tape Playback Control Button
 * Triggers procedural speech synthesis through tape playback filters.
 */
import React, { useState, useEffect } from 'react';
import { Play, Square, Volume2 } from 'lucide-react';
import { audioEngine } from '../audio/audioEngine';
import { EvpTape, EVP_SIGNALS } from '../game/evpManager';
import { GameEngine } from '../game/gameState';

interface TapePlayButtonProps {
  engine?: GameEngine;
  tape: EvpTape;
  tone?: 'paper' | 'metal' | 'dark';
}

export const TapePlayButton: React.FC<TapePlayButtonProps> = ({
  tape,
  tone = 'paper',
}) => {
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    return () => {
      if (playing) {
        audioEngine.stopTape();
      }
    };
  }, [playing]);

  const handleTogglePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (playing) {
      audioEngine.stopTape();
      setPlaying(false);
    } else {
      const sigDef = EVP_SIGNALS.find((s) => s.id === tape.signalId);
      const voiceTier = sigDef ? sigDef.voice : 1;
      const duration = audioEngine.playTape(voiceTier);
      setPlaying(true);
      setTimeout(() => {
        setPlaying(false);
      }, duration * 1000);
    }
  };

  const isPaper = tone === 'paper';

  return (
    <button
      onClick={handleTogglePlay}
      aria-label={playing ? 'Stop tape' : 'Play tape'}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-bold transition-all active:scale-95 shadow-sm ${
        playing
          ? 'bg-amber-600 text-white animate-pulse'
          : isPaper
          ? 'bg-[#1b1d18] text-[#ece6d3] hover:bg-[#33352d]'
          : 'bg-black/70 text-white hover:bg-black/90'
      }`}
    >
      {playing ? (
        <>
          <Square className="w-3.5 h-3.5 fill-current" />
          <span>STOPPING</span>
        </>
      ) : (
        <>
          <Play className="w-3.5 h-3.5 fill-current" />
          <span>PLAY TAPE</span>
        </>
      )}
      <Volume2 className="w-3 h-3 opacity-60" />
    </button>
  );
};
