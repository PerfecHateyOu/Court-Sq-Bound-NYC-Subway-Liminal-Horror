/**
 * Heartbeat ECG Trace & Real-time Pulse Monitor
 * Visualizes current sanity tier stress, heart rate BPM, and jitter.
 */
import React from 'react';
import { GameEngine } from '../game/gameState';
import { Activity } from 'lucide-react';
import { HEART_BPM } from '../constants';

interface HeartbeatTraceProps {
  engine: GameEngine;
}

export const HeartbeatTrace: React.FC<HeartbeatTraceProps> = ({ engine }) => {
  const bpm = HEART_BPM[engine.tier] || 72;
  const isCritical = engine.tier >= 2;

  return (
    <div className="flex items-center gap-1.5 font-mono text-xs">
      <Activity
        className={`w-3.5 h-3.5 ${
          isCritical ? 'text-red-500 animate-pulse' : 'text-[#6cbe45]'
        }`}
      />
      <span className={isCritical ? 'text-red-400 font-bold' : 'text-[#ece6d3]'}>
        {bpm} <span className="text-[10px] opacity-60">BPM</span>
      </span>
    </div>
  );
};
