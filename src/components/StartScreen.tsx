/**
 * Start & Briefing Screen
 * Authentic NYC MTA subway aesthetic: subway mosaic signage, route bullet,
 * career dossier launcher, and train boarding controls.
 */
import React, { useState } from 'react';
import { GameEngine } from '../game/gameState';
import { routeManager } from '../game/routeManager';
import { Settings, FolderLock, Play, ShieldAlert, GitBranch } from 'lucide-react';
import { CaseFilesModal } from './CaseFilesModal';
import { RouteSelector } from './RouteSelector';

interface StartScreenProps {
  onStart: () => void;
  onOpenSettings: () => void;
  isTouch?: boolean;
  engine?: GameEngine;
}

export const StartScreen: React.FC<StartScreenProps> = ({
  onStart,
  onOpenSettings,
  isTouch,
  engine,
}) => {
  const [caseFilesOpen, setCaseFilesOpen] = useState(false);
  const [routeOpen, setRouteOpen] = useState(false);
  const currentRoute = routeManager.activeRoute;

  return (
    <div className="fixed inset-0 z-30 flex flex-col items-center justify-between p-6 sm:p-10 bg-radial from-[#181a17] via-[#0f100e] to-[#080807] text-[#ece6d3] select-none">
      {/* Top Bar: Route Bullet & Subtitle */}
      <div className="w-full max-w-4xl flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span
            className="w-8 h-8 rounded-full font-black text-lg flex items-center justify-center shadow-lg"
            style={{ backgroundColor: currentRoute.bulletColor, color: currentRoute.bulletTextColor }}
          >
            {currentRoute.id}
          </span>
          <div className="flex flex-col">
            <span className="font-mono text-xs font-bold tracking-wider text-[#9a9684]">
              MTA NEW YORK CITY TRANSIT
            </span>
            <span className="text-[11px] font-mono text-[#6cbe45]">
              {currentRoute.name}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setRouteOpen(true)}
            aria-label="Change route line"
            className="p-2 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 hover:text-white transition-all flex items-center gap-1.5 text-xs font-mono"
          >
            <GitBranch className="w-4 h-4 text-[#6cbe45]" />
            <span className="hidden sm:inline">SWITCH LINE</span>
          </button>
          <button
            onClick={onOpenSettings}
            aria-label="Settings"
            className="p-2 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 hover:text-white transition-all"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Title Area */}
      <div className="flex flex-col items-center text-center max-w-2xl my-auto">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-black/50 border border-white/10 text-[11px] font-mono text-[#e3a83a] mb-4">
          <ShieldAlert className="w-3.5 h-3.5" />
          <span>PSYCHOLOGICAL LIMINAL SURVIVAL // v5.1</span>
        </div>

        <h1 className="text-4xl sm:text-6xl md:text-7xl font-black uppercase tracking-tighter leading-none mb-3 text-white drop-shadow-md">
          Court Sq-Bound
        </h1>

        <p className="text-sm sm:text-base text-[#9a9684] max-w-lg leading-relaxed mb-8">
          The late-night subway ride that keeps going. Watch your parents, monitor the car for irregularities, tune into intercepted broadcaster frequencies, and survive the journey.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
          <button
            onClick={onStart}
            className="w-full sm:w-auto px-8 py-4 rounded-full font-black text-base tracking-wide flex items-center justify-center gap-3 transition-all active:scale-95 shadow-xl hover:brightness-110"
            style={{
              backgroundColor: currentRoute.bulletColor,
              color: currentRoute.bulletTextColor,
            }}
          >
            <Play className="w-5 h-5 fill-current" />
            <span>BOARD {currentRoute.id} TRAIN</span>
          </button>

          <button
            onClick={() => setCaseFilesOpen(true)}
            className="w-full sm:w-auto px-6 py-4 rounded-full bg-black/60 hover:bg-black/80 border border-white/20 text-[#ece6d3] font-bold text-sm tracking-wide flex items-center justify-center gap-2.5 transition-all active:scale-95"
          >
            <FolderLock className="w-4 h-4 text-[#e3a83a]" />
            <span>Case Files & Archive</span>
          </button>
        </div>
      </div>

      {/* Footer Info */}
      <div className="w-full max-w-4xl flex items-center justify-between text-[11px] font-mono text-[#6c6a5e] border-t border-white/10 pt-4">
        <span>Controls: {isTouch ? 'Virtual Joystick & Tap' : 'WASD Move • Mouse Look • Hold Flag • [C] Camera • [R] Recorder'}</span>
        <span>Court Sq-Bound v5.1</span>
      </div>

      {/* Case Files Modal */}
      {caseFilesOpen && (
        <CaseFilesModal
          engine={engine}
          onClose={() => setCaseFilesOpen(false)}
        />
      )}

      {/* Route Selector Modal */}
      {routeOpen && (
        <RouteSelector
          onClose={() => setRouteOpen(false)}
          onSelectRoute={() => {}}
        />
      )}
    </div>
  );
};
