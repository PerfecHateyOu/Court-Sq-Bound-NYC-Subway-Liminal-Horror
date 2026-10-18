/**
 * Dad's microcassette recorder, raised (Operation Skyward, Phase 2).
 *
 * Sits where the Flag button is (you can't flag with your hands full). Tune with the scrub
 * strip, the arrows, [ and ], or the mouse wheel; hold REC (or Space) to record. The meter
 * and the lock light react to every carrier alike, broadcast or decoy: what you hear (and the
 * words, shown here as subtitles) is the only difference.
 */
import React, { useEffect, useRef, useState } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { evp, EVP_MIN_KHZ, EVP_MAX_KHZ, transcriptOf } from '../game/evpManager';
import { settings } from '../settings';
import { GameEngine } from '../game/gameState';

const SPAN = EVP_MAX_KHZ - EVP_MIN_KHZ;

const Reel: React.FC<{ spinning: boolean }> = ({ spinning }) => (
  <svg viewBox="0 0 40 40" className={`w-9 h-9 ${spinning ? 'animate-spin [animation-duration:1.6s]' : ''}`} aria-hidden="true">
    <circle cx="20" cy="20" r="18" fill="#1a1712" stroke="#4a4438" strokeWidth="2" />
    <circle cx="20" cy="20" r="11" fill="#3a2f22" />
    {[0, 120, 240].map((a) => (
      <rect key={a} x="18.5" y="5" width="3" height="9" rx="1" fill="#8d8371" transform={`rotate(${a} 20 20)`} />
    ))}
    <circle cx="20" cy="20" r="3.5" fill="#d9d1bd" />
  </svg>
);

export const EvpRecorder: React.FC<{ engine: GameEngine }> = ({ engine }) => {
  const stripRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ id: number; x: number } | null>(null);
  const reduced = settings.effectsReduced();

  // Brief "saved" note after a tape is recorded (kept on the recorder, so a save between renders
  // still shows). Re-render once when it expires.
  const SAVED_MS = 2600;
  const saved = evp.lastSaved;
  const savedTitle = saved && Date.now() - saved.at < SAVED_MS ? saved.title : null;
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!saved) return;
    const left = saved.at + SAVED_MS - Date.now();
    if (left <= 0) return;
    const t = setTimeout(() => setTick((n) => n + 1), left + 20);
    return () => clearTimeout(t);
  }, [saved]);

  const locked = evp.locked;
  const sig = locked?.kind === 'signal' ? locked.signal! : null;
  const full = sig ? transcriptOf(sig) : '';
  const words = sig ? full.slice(0, Math.max(1, Math.round(full.length * evp.reveal))) : '';
  const needle = -50 + 100 * evp.meter;
  const markerPct = ((evp.khz - EVP_MIN_KHZ) / SPAN) * 100;

  let status: string;
  if (savedTitle) status = `Saved to tape: ${savedTitle}`;
  else if (sig) status = words;
  else if (locked) status = '— a carrier tone, no voice —';
  else if (evp.recording) status = 'Recording hiss…';
  else status = engine.phase === 'ride' ? 'Tune slowly. Something is out there.' : 'Nothing comes through at a standstill.';

  return (
    <div
      data-testid="evp-recorder"
      className="absolute right-4 bottom-5 w-[min(300px,calc(100vw-160px))] pointer-events-auto select-none rounded-lg border border-[#4a4438] bg-[#15130f]/95 shadow-2xl text-[#d9d1bd] p-3"
    >
      <div className="flex items-center justify-between">
        <span className="font-mono text-[10px] tracking-[0.25em] text-[#8d8371]">MICROCASSETTE</span>
        <div className="flex items-center gap-2">
          <span
            className={`w-2 h-2 rounded-full ${evp.recording ? 'bg-red-500 shadow-[0_0_6px_#ef4444]' : 'bg-[#3a3328]'}`}
            aria-label={evp.recording ? 'Recording' : 'Not recording'}
          />
          <button
            onClick={() => engine.toggleRecorder()}
            aria-label="Lower recorder"
            className="w-7 h-7 -mr-1 flex items-center justify-center rounded-full text-[#8d8371] hover:text-[#ece6d3] hover:bg-white/10"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="mt-1.5 flex items-center gap-3">
        <div className="flex gap-1.5 p-1.5 rounded bg-black/40 border border-[#3a3328]">
          <Reel spinning={evp.recording && !reduced} />
          <Reel spinning={evp.recording && !reduced} />
        </div>
        {/* VU meter */}
        <svg viewBox="0 0 100 56" className="w-[92px] h-[52px]" role="img" aria-label="Signal meter">
          <rect x="1" y="1" width="98" height="54" rx="4" fill="#efe6c9" />
          <path d="M14 46 A40 40 0 0 1 86 46" fill="none" stroke="#6d6450" strokeWidth="1.5" />
          <path d="M66 18 A40 40 0 0 1 86 46" fill="none" stroke="#b33a2b" strokeWidth="3" />
          <line
            x1="50"
            y1="50"
            x2="50"
            y2="12"
            stroke="#1b1d18"
            strokeWidth="1.6"
            transform={`rotate(${needle} 50 50)`}
            style={{ transition: reduced ? 'none' : 'transform 90ms linear' }}
          />
          <circle cx="50" cy="50" r="3" fill="#1b1d18" />
          <text x="50" y="30" textAnchor="middle" fontSize="7" fontFamily="monospace" fill="#6d6450">
            VU
          </text>
        </svg>
        <div className="flex-1 text-right">
          <div className="font-mono text-lg font-bold tabular-nums text-[#ece6d3]" data-testid="evp-khz">
            {evp.khz.toFixed(1)}
          </div>
          <div className="flex items-center justify-end gap-1.5 font-mono text-[10px] text-[#8d8371]">
            kHz
            <span
              className={`w-2 h-2 rounded-full ${locked ? 'bg-[#6cbe45] shadow-[0_0_6px_#6cbe45]' : 'bg-[#2c3a28]'}`}
              aria-label={locked ? 'Locked on' : 'No lock'}
            />
          </div>
        </div>
      </div>

      {/* Tuning: drag the strip, nudge with arrows, or jump 5 kHz */}
      <div className="mt-2 flex items-center gap-1">
        <button
          aria-label="Tune down 5 kHz"
          onClick={() => evp.tune(-5.0)}
          className="px-1.5 h-9 flex items-center justify-center rounded bg-black/40 border border-[#3a3328] hover:border-[#8d8371] font-mono text-[9px] text-[#8d8371]"
          title="-5 kHz"
        >
          -5k
        </button>
        <button
          aria-label="Tune down"
          onClick={() => evp.tune(-0.5)}
          className="w-7 h-9 flex items-center justify-center rounded bg-black/40 border border-[#3a3328] hover:border-[#8d8371]"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div
          ref={stripRef}
          role="slider"
          aria-label="Tuning"
          aria-valuemin={EVP_MIN_KHZ}
          aria-valuemax={EVP_MAX_KHZ}
          aria-valuenow={evp.khz}
          data-testid="evp-strip"
          className="relative flex-1 h-9 rounded bg-black/50 border border-[#3a3328] touch-none cursor-ew-resize overflow-hidden"
          style={{
            backgroundImage:
              'repeating-linear-gradient(90deg, rgba(217,209,189,0.35) 0 1px, transparent 1px 9px), repeating-linear-gradient(90deg, rgba(217,209,189,0.6) 0 1px, transparent 1px 45px)',
            backgroundSize: '100% 40%, 100% 70%',
            backgroundRepeat: 'repeat-x',
            backgroundPosition: '0 100%, 0 100%',
          }}
          onPointerDown={(e) => {
            e.preventDefault();
            drag.current = { id: e.pointerId, x: e.clientX };
            try {
              e.currentTarget.setPointerCapture(e.pointerId);
            } catch {
              /* synthetic pointer */
            }
          }}
          onPointerMove={(e) => {
            if (!drag.current || drag.current.id !== e.pointerId) return;
            // Fine control: 1 px of drag is 0.1 kHz.
            evp.tune((e.clientX - drag.current.x) * 0.1);
            drag.current.x = e.clientX;
          }}
          onPointerUp={() => (drag.current = null)}
          onPointerCancel={() => (drag.current = null)}
        >
          <div className="absolute top-0 bottom-0 w-0.5 bg-[#e3a83a]" style={{ left: `${markerPct}%` }} />
        </div>
        <button
          aria-label="Tune up"
          onClick={() => evp.tune(0.5)}
          className="w-7 h-9 flex items-center justify-center rounded bg-black/40 border border-[#3a3328] hover:border-[#8d8371]"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
        <button
          aria-label="Tune up 5 kHz"
          onClick={() => evp.tune(5.0)}
          className="px-1.5 h-9 flex items-center justify-center rounded bg-black/40 border border-[#3a3328] hover:border-[#8d8371] font-mono text-[9px] text-[#8d8371]"
          title="+5 kHz"
        >
          +5k
        </button>
      </div>

      <div className="mt-2 flex items-stretch gap-2">
        <button
          onPointerDown={(e) => {
            e.preventDefault();
            evp.setRecording(true);
          }}
          onPointerUp={() => evp.setRecording(false)}
          onPointerCancel={() => evp.setRecording(false)}
          onPointerLeave={() => evp.setRecording(false)}
          onContextMenu={(e) => e.preventDefault()}
          className={`w-[86px] shrink-0 rounded border font-mono text-[11px] font-bold tracking-wider touch-none ${
            evp.recording ? 'bg-red-600/80 border-red-400 text-white' : 'bg-black/40 border-[#5a2a24] text-[#e8a49a]'
          }`}
        >
          HOLD
          <br />
          TO REC
        </button>
        <p
          aria-live="polite"
          data-testid="evp-transcript"
          className={`flex-1 min-h-[2.6rem] text-[11px] leading-snug ${sig ? 'italic text-[#ece6d3]' : 'text-[#8d8371]'}`}
        >
          {status}
        </p>
      </div>
      {!engine.isTouch && (
        <p className="mt-1.5 font-mono text-[9px] text-[#6d6450]">[ ] or wheel to tune · hold Space to record · R to lower</p>
      )}
    </div>
  );
};
