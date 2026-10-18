/**
 * Settings: look speed, volumes, screen effects, vibration, and erasing saved progress.
 * Opens over the start screen or the pause menu. Every change applies at once and is saved
 * on this device.
 */
import { fullscreenSupported } from '../ui/fullscreen';
import React from 'react';
import { X } from 'lucide-react';
import { settings, useSettings, savedProgress, SENSITIVITY_RANGE, type ScreenEffects } from '../settings';
import { haptics } from '../game/haptics';
import { useEscape } from '../ui/escape';

interface SettingsPanelProps {
  onClose: () => void;
  isTouch: boolean;
}

const EFFECTS: Array<{ value: ScreenEffects; label: string }> = [
  { value: 'system', label: 'Match device' },
  { value: 'full', label: 'Full' },
  { value: 'reduced', label: 'Reduced' },
];

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <section className="py-3.5 border-t border-white/10 first:border-t-0 first:pt-0">
    <h3 className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-[#9a9684] mb-2.5">{title}</h3>
    <div className="space-y-3">{children}</div>
  </section>
);

const Slider: React.FC<{
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  display: string;
  onChange: (v: number) => void;
}> = ({ id, label, value, min, max, step, display, onChange }) => (
  <div>
    <div className="flex items-baseline justify-between gap-3 text-sm">
      <label htmlFor={id} className="text-[#ece6d3] font-semibold">
        {label}
      </label>
      <output htmlFor={id} className="font-mono text-xs text-[#9a9684] tabular-nums">
        {display}
      </output>
    </div>
    <input
      id={id}
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(parseFloat(e.target.value))}
      className="mt-1.5 w-full h-6 accent-[#6cbe45] cursor-pointer"
    />
  </div>
);

const Check: React.FC<{ label: string; checked: boolean; onChange: (v: boolean) => void; hint?: string }> = ({
  label,
  checked,
  onChange,
  hint,
}) => (
  <label className="flex items-start gap-2.5 cursor-pointer text-sm text-[#ece6d3] font-semibold">
    <input
      type="checkbox"
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
      className="mt-0.5 w-4 h-4 rounded accent-[#6cbe45] shrink-0"
    />
    <span>
      {label}
      {hint && <span className="block text-xs font-normal text-[#9a9684] mt-0.5">{hint}</span>}
    </span>
  </label>
);

export const SettingsPanel: React.FC<SettingsPanelProps> = ({ onClose, isTouch }) => {
  const s = useSettings();
  const [vibrate, setVibrate] = React.useState(haptics.enabled);
  const [confirmErase, setConfirmErase] = React.useState(false);
  const [erased, setErased] = React.useState(false);
  // Counted when the confirmation opens, so it names exactly what will go.
  const saved = React.useMemo(() => savedProgress(), [confirmErase, erased]);
  const canVibrate = isTouch && haptics.supported;
  // Esc closes the panel, or first cancels the erase confirmation if it's open.
  useEscape(onClose);
  useEscape(() => setConfirmErase(false), confirmErase);
  const pct = (v: number) => `${Math.round(v * 100)}%`;

  const effectsNote =
    s.screenEffects === 'system'
      ? settings.systemPrefersReduced()
        ? 'Your device asks for reduced motion, so these are off.'
        : 'Your device doesn’t ask for reduced motion, so these are on.'
      : s.screenEffects === 'reduced'
      ? 'Off. The heartbeat line still shows your tier, without moving.'
      : 'On, whatever your device setting.';

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center overflow-y-auto safe-pad bg-black/70 backdrop-blur-sm"
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-title"
        className="w-full max-w-md my-auto rounded bg-[#101411] border border-white/15 shadow-2xl text-left animate-in fade-in zoom-in-95 duration-200"
      >
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-white/10">
          <h2 id="settings-title" className="text-xl font-black text-[#ece6d3] uppercase tracking-wide">
            Settings
          </h2>
          <button
            onClick={onClose}
            aria-label="Close settings"
            className="w-9 h-9 -mr-1.5 flex items-center justify-center rounded-full text-[#9a9684] hover:text-[#ece6d3] hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-5 py-4">
          <Section title="Look">
            <Slider
              id="set-sens"
              label="Look speed"
              value={s.lookSensitivity}
              min={SENSITIVITY_RANGE[0]}
              max={SENSITIVITY_RANGE[1]}
              step={0.05}
              display={`${s.lookSensitivity.toFixed(2)}×`}
              onChange={(v) => settings.set({ lookSensitivity: v })}
            />
            <Check label="Invert vertical look" checked={s.invertY} onChange={(v) => settings.set({ invertY: v })} />
          </Section>

          <Section title="Sound">
            <Slider
              id="set-game-vol"
              label="Game sounds"
              value={s.gameVolume}
              min={0}
              max={1}
              step={0.05}
              display={pct(s.gameVolume)}
              onChange={(v) => settings.set({ gameVolume: v })}
            />
            <Slider
              id="set-music-vol"
              label="Pause music"
              value={s.musicVolume}
              min={0}
              max={1}
              step={0.05}
              display={pct(s.musicVolume)}
              onChange={(v) => settings.set({ musicVolume: v })}
            />
            {!isTouch && <p className="text-xs text-[#9a9684]">M mutes everything at any time.</p>}
          </Section>

          <Section title="Screen effects">
            <div role="radiogroup" aria-label="Screen effects" className="grid grid-cols-3 gap-1 p-1 rounded bg-black/40 border border-white/10">
              {EFFECTS.map((o) => {
                const on = s.screenEffects === o.value;
                return (
                  <button
                    key={o.value}
                    role="radio"
                    aria-checked={on}
                    onClick={() => settings.set({ screenEffects: o.value })}
                    className={`py-2 px-1 rounded text-xs sm:text-sm font-bold transition-colors ${
                      on ? 'bg-[#6cbe45] text-[#0f1a0b]' : 'text-[#ece6d3] hover:bg-white/10'
                    }`}
                  >
                    {o.label}
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-[#9a9684] leading-snug">
              Screen tearing, anxious breathing, and the moving heartbeat line. {effectsNote}
            </p>
          </Section>

          {fullscreenSupported() && (
            <Section title="Display">
              <Check
                label="Full screen when boarding"
                hint="Hides the browser's bars during the ride. Press Esc (or use the pause menu) to leave."
                checked={s.fullscreenOnBoard}
                onChange={(v) => settings.set({ fullscreenOnBoard: v })}
              />
            </Section>
          )}

          {canVibrate && (
            <Section title="Vibration">
              <Check
                label="Vibrate for catches"
                hint="At each stop, a soft pulse for every anomaly you caught on the way in."
                checked={vibrate}
                onChange={(v) => {
                  setVibrate(v);
                  haptics.setEnabled(v);
                }}
              />
            </Section>
          )}

          <Section title="Saved progress">
            {erased ? (
              <p role="status" className="text-sm text-[#6cbe45] font-semibold">
                Saved progress erased.
              </p>
            ) : !saved.length ? (
              <p className="text-sm text-[#9a9684]">Nothing saved on this device yet.</p>
            ) : !confirmErase ? (
              <>
                <p className="text-xs text-[#9a9684] leading-snug mb-2">
                  Your Case Files, endings, tapes, prints, badges and finished rides on this device. Settings are kept.
                </p>
                <button
                  onClick={() => setConfirmErase(true)}
                  className="w-full py-2.5 px-4 rounded border border-white/20 hover:border-[#e3a83a]/60 text-[#ece6d3] font-bold text-sm transition-colors"
                >
                  Erase saved progress
                </button>
              </>
            ) : (
              <div
                role="alertdialog"
                aria-labelledby="erase-confirm-text"
                className="p-3 rounded border border-[#e3a83a]/40 bg-[#e3a83a]/10"
              >
                <div id="erase-confirm-text" className="text-sm text-[#ece6d3] leading-snug">
                  <p>Erase everything saved on this device? This can’t be undone.</p>
                  <ul className="mt-1.5 list-disc pl-5 text-[#ece6d3]/85" data-testid="erase-list">
                    {saved.map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                  </ul>
                  {saved.some((l) => l.includes('finished ride')) && (
                    <p className="mt-1.5 text-xs text-[#9a9684]">
                      Nightmare mode and chapter select lock again until you finish a ride.
                    </p>
                  )}
                  <p className="mt-1.5 text-xs text-[#9a9684]">Your settings are kept.</p>
                </div>
                <div className="mt-3 flex gap-2">
                  <button
                    autoFocus
                    onClick={() => {
                      settings.eraseProgress();
                      setConfirmErase(false);
                      setErased(true);
                    }}
                    className="flex-1 py-2.5 px-4 rounded bg-[#e3a83a] hover:bg-[#f0b84a] text-[#1a1205] font-extrabold text-sm transition-colors"
                  >
                    Erase
                  </button>
                  <button
                    onClick={() => setConfirmErase(false)}
                    className="flex-1 py-2.5 px-4 rounded border border-white/20 hover:border-white/40 text-[#ece6d3] font-bold text-sm transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </Section>
        </div>

        <div className="px-5 pb-5">
          <button
            autoFocus
            onClick={onClose}
            className="w-full py-3 px-6 rounded bg-[#6cbe45] hover:bg-[#7ad150] text-[#0f1a0b] font-extrabold text-base tracking-wide transition-all active:scale-[0.98]"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
