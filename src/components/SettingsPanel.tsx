/**
 * Settings Panel Modal
 * Configures audio levels, mouse/keyboard sensitivity, screen motion reduction,
 * and save file progress reset.
 */
import React, { useState, useEffect } from 'react';
import { settings, Settings, SENSITIVITY_RANGE } from '../settings';
import { X, Volume2, Sliders, Eye, Trash2 } from 'lucide-react';

interface SettingsPanelProps {
  onClose: () => void;
  isTouch?: boolean;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({ onClose, isTouch }) => {
  const [current, setCurrent] = useState<Settings>(settings.get());
  const [confirmReset, setConfirmReset] = useState(false);

  useEffect(() => {
    return settings.subscribe(() => {
      setCurrent(settings.get());
    });
  }, []);

  const handleChange = <K extends keyof Settings>(key: K, val: Settings[K]) => {
    settings.set({ [key]: val });
    setCurrent(settings.get());
  };

  const handleResetProgress = () => {
    if (confirmReset) {
      settings.resetProgress();
      setConfirmReset(false);
    } else {
      setConfirmReset(true);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md select-none"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-[#18191a] text-[#ece6d3] border border-white/20 rounded-md p-5 sm:p-6 shadow-2xl flex flex-col gap-5"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-[#e3a83a]" />
            <h2 className="text-xl font-bold tracking-tight text-white">Settings</h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close settings"
            className="p-1 rounded hover:bg-white/10 text-white/70 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Audio Volume Slider */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5 font-medium text-white">
              <Volume2 className="w-4 h-4 text-[#6cbe45]" />
              Master Volume
            </span>
            <span className="font-mono text-[#9a9684]">
              {Math.round(current.gameVolume * 100)}%
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={current.gameVolume}
            onChange={(e) => handleChange('gameVolume', parseFloat(e.target.value))}
            className="w-full accent-[#6cbe45] cursor-pointer"
          />
        </div>

        {/* Look Sensitivity */}
        {!isTouch && (
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-white">Look Sensitivity</span>
              <span className="font-mono text-[#9a9684]">
                {current.lookSensitivity.toFixed(2)}x
              </span>
            </div>
            <input
              type="range"
              min={SENSITIVITY_RANGE[0]}
              max={SENSITIVITY_RANGE[1]}
              step={0.1}
              value={current.lookSensitivity}
              onChange={(e) => handleChange('lookSensitivity', parseFloat(e.target.value))}
              className="w-full accent-[#e3a83a] cursor-pointer"
            />
          </div>
        )}

        {/* Screen Motion Reduction */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5 font-medium text-white">
              <Eye className="w-4 h-4 text-[#e3a83a]" />
              Screen Effects & Shaking
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {(['system', 'full', 'reduced'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => handleChange('screenEffects', mode)}
                className={`py-1.5 rounded text-xs font-bold uppercase transition-all ${
                  current.screenEffects === mode
                    ? 'bg-[#6cbe45] text-[#1b1d18]'
                    : 'bg-white/5 hover:bg-white/10 text-[#9a9684]'
                }`}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>

        {/* Reset Progress Section */}
        <div className="border-t border-white/10 pt-4 flex items-center justify-between">
          <button
            onClick={handleResetProgress}
            className={`px-3 py-1.5 rounded text-xs font-bold flex items-center gap-1.5 transition-all ${
              confirmReset
                ? 'bg-red-600 text-white animate-pulse'
                : 'bg-white/5 hover:bg-white/10 text-red-400'
            }`}
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>{confirmReset ? 'CONFIRM PURGE ALL DATA' : 'Reset Career Data'}</span>
          </button>

          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-[#ece6d3] hover:bg-white text-[#1b1d18] text-xs font-bold rounded transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
