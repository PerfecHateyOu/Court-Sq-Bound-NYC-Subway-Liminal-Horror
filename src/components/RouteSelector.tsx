/**
 * Branching Subway Line Route Selector
 * Allows switching between MTA transit lines (G Crosstown, L Canarsie, 7 Ghost Line)
 * with authentic MTA strip map bullets and environmental profiles.
 */
import React, { useRef } from 'react';
import { routeManager, ROUTES } from '../game/routeManager';
import { TransitLineRoute } from '../types';
import { X, GitBranch, ArrowRight, ShieldCheck, AlertOctagon } from 'lucide-react';
import { Overlay } from '../ui/Overlay';

interface RouteSelectorProps {
  onClose: () => void;
  onSelectRoute?: (route: TransitLineRoute) => void;
}

export const RouteSelector: React.FC<RouteSelectorProps> = ({ onClose, onSelectRoute }) => {
  const currentRoute = routeManager.activeRoute;
  const allRoutes = routeManager.getAllRoutes();

  // Focus starts on the line you're on, stays in the dialog, and goes back to whatever opened it.
  const currentRef = useRef<HTMLButtonElement>(null);

  const handleSelect = (r: TransitLineRoute) => {
    // Picking the line you're on just closes the selector: nothing switched, so nothing to say.
    if (r.id !== currentRoute.id) {
      routeManager.setRoute(r.id);
      if (onSelectRoute) onSelectRoute(r);
    }
    onClose();
  };

  return (
    <Overlay
      onClose={onClose}
      labelledBy="route-selector-title"
      width="2xl"
      layer={50}
      backdropClassName="bg-black/85 backdrop-blur-md"
      panelClassName="bg-[#141715] border border-white/15 rounded-xl text-cream select-none"
      bodyClassName="p-4 sm:p-6 space-y-3 sm:space-y-4"
      initialFocus={() => currentRef.current}
      testId="route-selector"
      header={
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-white/10 flex items-center justify-between gap-3 bg-[#191d1a]">
          <div className="flex items-center gap-3 min-w-0">
            <div className="shrink-0 w-9 h-9 rounded-lg bg-g-line/15 border border-g-line/30 flex items-center justify-center text-g-line">
              <GitBranch className="w-5 h-5" />
            </div>
            <div>
              <h2 id="route-selector-title" className="font-bold text-base sm:text-lg text-cream tracking-tight">
                MTA Transit Line Switching
              </h2>
              <p className="text-xs text-dim">
                Ride the same journey on another line's stations.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close route selector"
            className="shrink-0 w-9 h-9 rounded-lg bg-black/50 border border-white/10 hover:bg-black/80 flex items-center justify-center text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cream"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      }
      footer={
        <div className="px-4 sm:px-6 py-3 bg-panel border-t border-white/5 text-2xs text-dim flex items-center justify-between gap-3">
          <span>Switching renames the stops and announcements ahead, from now on. Every new ride starts on the G.</span>
          <span className="shrink-0 whitespace-nowrap text-dim font-mono">LAST LOCAL v5.2</span>
        </div>
      }
    >
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
                className={`relative w-full text-left p-4 rounded-lg border cursor-pointer transition-all duration-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cream focus-visible:ring-offset-2 focus-visible:ring-offset-[#141715] ${
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
                      <span className="font-bold text-sm sm:text-base text-cream tracking-tight">
                        {r.name}
                      </span>
                      {isSelected && (
                        <span className="text-3xs font-mono font-bold bg-g-line/20 text-g-line border border-g-line/40 px-2 py-0.5 rounded">
                          CURRENT
                        </span>
                      )}
                    </span>
                    <span id={`route-desc-${r.id}`} className="block">
                      <span className="block text-xs text-dim mt-0.5 leading-relaxed max-w-md">
                        {r.description}
                      </span>
                      <span className="block text-3xs font-mono text-dim mt-1">
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
                        : 'bg-g-line hover:bg-g-line-hi text-black font-bold active:scale-95 shadow-md'
                    }`}
                  >
                    <span>{isSelected ? 'Active Line' : 'Switch Line'}</span>
                    {!isSelected && <ArrowRight className="w-3.5 h-3.5" />}
                  </span>
                </span>
              </button>
            );
          })}
    </Overlay>
  );
};
