/**
 * Branching Subway Line Route Selector
 * Allows switching between MTA transit lines (G Crosstown, L Canarsie, 7 Ghost Line)
 * with authentic MTA strip map bullets and environmental profiles.
 */
import React, { useEffect, useRef } from 'react';
import { routeManager, ROUTES } from '../game/routeManager';
import { TransitLineRoute } from '../types';
import { X, GitBranch, ArrowRight, ShieldCheck, AlertOctagon } from 'lucide-react';
import { useEscape } from '../ui/escape';

interface RouteSelectorProps {
  onClose: () => void;
  onSelectRoute?: (route: TransitLineRoute) => void;
}

export const RouteSelector: React.FC<RouteSelectorProps> = ({ onClose, onSelectRoute }) => {
  const currentRoute = routeManager.activeRoute;
  const allRoutes = routeManager.getAllRoutes();

  const dialogRef = useRef<HTMLDivElement>(null);
  const currentRef = useRef<HTMLButtonElement>(null);
  useEscape(onClose);

  // Focus starts on the line you're on, and goes back to whatever opened the selector.
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    currentRef.current?.focus();
    return () => {
      if (opener?.isConnected) opener.focus();
    };
  }, []);

  // Keep Tab inside the dialog.
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key !== 'Tab' || !dialogRef.current) return;
    const items = dialogRef.current.querySelectorAll<HTMLElement>('button:not([disabled])');
    if (!items.length) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  const handleSelect = (r: TransitLineRoute) => {
    routeManager.setRoute(r.id);
    if (onSelectRoute) onSelectRoute(r);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-center safe-pad bg-black/85 backdrop-blur-md select-none animate-in fade-in duration-200">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="route-selector-title"
        onKeyDown={onKeyDown}
        className="relative w-full max-w-2xl my-auto max-h-full bg-[#141715] border border-white/15 rounded-xl shadow-2xl overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="shrink-0 px-4 sm:px-6 py-3 sm:py-4 border-b border-white/10 flex items-center justify-between gap-3 bg-[#191d1a]">
          <div className="flex items-center gap-3 min-w-0">
            <div className="shrink-0 w-9 h-9 rounded-lg bg-[#6cbe45]/15 border border-[#6cbe45]/30 flex items-center justify-center text-[#6cbe45]">
              <GitBranch className="w-5 h-5" />
            </div>
            <div>
              <h2 id="route-selector-title" className="font-bold text-base sm:text-lg text-[#ece6d3] tracking-tight">
                MTA Transit Line Switching
              </h2>
              <p className="text-xs text-[#9a9684]">
                Select track routing at junction point. Each line alters transit cars and psychological hazard profiles.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close route selector"
            className="shrink-0 w-9 h-9 rounded-lg bg-black/50 border border-white/10 hover:bg-black/80 flex items-center justify-center text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ece6d3]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Route Cards List */}
        <div className="min-h-0 overflow-y-auto p-4 sm:p-6 space-y-3 sm:space-y-4">
          {allRoutes.map((r) => {
            const isSelected = r.id === currentRoute.id;

            return (
              <button
                type="button"
                key={r.id}
                ref={isSelected ? currentRef : undefined}
                onClick={() => handleSelect(r)}
                aria-current={isSelected ? 'true' : undefined}
                aria-label={`${r.name}${isSelected ? ' (current line)' : ''}`}
                aria-describedby={`route-desc-${r.id}`}
                className={`relative w-full text-left p-4 rounded-lg border cursor-pointer transition-all duration-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ece6d3] focus-visible:ring-offset-2 focus-visible:ring-offset-[#141715] ${
                  isSelected
                    ? 'bg-white/10 border-white/40 shadow-lg'
                    : 'bg-[#181b19] hover:bg-[#202521] border-white/10 hover:border-white/25'
                }`}
              >
                {/* Route Bullet & Name */}
                <span className="flex items-start sm:items-center gap-3.5">
                  <span
                    className="w-10 h-10 rounded-full font-extrabold text-base flex items-center justify-center shrink-0 shadow-md"
                    style={{ backgroundColor: r.bulletColor, color: r.bulletTextColor }}
                  >
                    {r.id}
                  </span>

                  <span className="block">
                    <span className="flex items-center gap-2">
                      <span className="font-bold text-sm sm:text-base text-[#ece6d3] tracking-tight">
                        {r.name}
                      </span>
                      {isSelected && (
                        <span className="text-[10px] font-mono font-bold bg-[#6cbe45]/20 text-[#6cbe45] border border-[#6cbe45]/40 px-2 py-0.5 rounded">
                          CURRENT
                        </span>
                      )}
                    </span>
                    <span id={`route-desc-${r.id}`} className="block">
                      <span className="block text-xs text-[#9a9684] mt-0.5 leading-relaxed max-w-md">
                        {r.description}
                      </span>
                      <span className="block text-[10px] font-mono text-white/50 mt-1">
                        Terminals: {r.stops[1]} → {r.stops[r.stops.length - 1]}
                      </span>
                    </span>
                  </span>
                </span>

                {/* Switch Action Button */}
                <span className="self-end sm:self-center shrink-0" aria-hidden="true">
                  <span
                    className={`px-3.5 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all ${
                      isSelected
                        ? 'bg-white/20 text-white cursor-default'
                        : 'bg-[#6cbe45] hover:bg-[#7ad150] text-black font-bold active:scale-95 shadow-md'
                    }`}
                  >
                    <span>{isSelected ? 'Active Line' : 'Switch Line'}</span>
                    {!isSelected && <ArrowRight className="w-3.5 h-3.5" />}
                  </span>
                </span>
              </button>
            );
          })}
        </div>

        {/* Footer Guidance */}
        <div className="shrink-0 px-4 sm:px-6 py-3 bg-[#101311] border-t border-white/5 text-[11px] text-[#9a9684] flex items-center justify-between gap-3">
          <span>Route switches take effect upon leaving the current haven station.</span>
          <span className="shrink-0 whitespace-nowrap text-white/40 font-mono">COURT SQ-BOUND v5.2</span>
        </div>
      </div>
    </div>
  );
};
