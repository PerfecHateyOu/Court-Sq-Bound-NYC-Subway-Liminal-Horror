/**
 * Branching Subway Line Route Selector
 * Allows switching between MTA transit lines (G Crosstown, L Canarsie, 7 Ghost Line)
 * with authentic MTA strip map bullets and environmental profiles.
 */
import React from 'react';
import { routeManager, ROUTES } from '../game/routeManager';
import { TransitLineRoute } from '../types';
import { X, GitBranch, ArrowRight, ShieldCheck, AlertOctagon } from 'lucide-react';

interface RouteSelectorProps {
  onClose: () => void;
  onSelectRoute?: (route: TransitLineRoute) => void;
}

export const RouteSelector: React.FC<RouteSelectorProps> = ({ onClose, onSelectRoute }) => {
  const currentRoute = routeManager.activeRoute;
  const allRoutes = routeManager.getAllRoutes();

  const handleSelect = (r: TransitLineRoute) => {
    routeManager.setRoute(r.id);
    if (onSelectRoute) onSelectRoute(r);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/85 backdrop-blur-md select-none animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-[#141715] border border-white/15 rounded-xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-[#191d1a]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#6cbe45]/15 border border-[#6cbe45]/30 flex items-center justify-center text-[#6cbe45]">
              <GitBranch className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-base sm:text-lg text-[#ece6d3] tracking-tight">
                MTA Transit Line Switching
              </h2>
              <p className="text-xs text-[#9a9684]">
                Select track routing at junction point. Each line alters transit cars and psychological hazard profiles.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-lg bg-black/50 border border-white/10 hover:bg-black/80 flex items-center justify-center text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Route Cards List */}
        <div className="p-6 space-y-4">
          {allRoutes.map((r) => {
            const isSelected = r.id === currentRoute.id;

            return (
              <div
                key={r.id}
                onClick={() => handleSelect(r)}
                className={`relative p-4 rounded-lg border cursor-pointer transition-all duration-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
                  isSelected
                    ? 'bg-white/10 border-white/40 shadow-lg'
                    : 'bg-[#181b19] hover:bg-[#202521] border-white/10 hover:border-white/25'
                }`}
              >
                {/* Route Bullet & Name */}
                <div className="flex items-start sm:items-center gap-3.5">
                  <span
                    className="w-10 h-10 rounded-full font-extrabold text-base flex items-center justify-center shrink-0 shadow-md"
                    style={{ backgroundColor: r.bulletColor, color: r.bulletTextColor }}
                  >
                    {r.id}
                  </span>

                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-sm sm:text-base text-[#ece6d3] tracking-tight">
                        {r.name}
                      </h3>
                      {isSelected && (
                        <span className="text-[10px] font-mono font-bold bg-[#6cbe45]/20 text-[#6cbe45] border border-[#6cbe45]/40 px-2 py-0.5 rounded">
                          CURRENT
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[#9a9684] mt-0.5 leading-relaxed max-w-md">
                      {r.description}
                    </p>
                    <div className="text-[10px] font-mono text-white/50 mt-1">
                      Terminals: {r.stops[1]} → {r.stops[r.stops.length - 1]}
                    </div>
                  </div>
                </div>

                {/* Switch Action Button */}
                <div className="self-end sm:self-center shrink-0">
                  <button
                    className={`px-3.5 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all ${
                      isSelected
                        ? 'bg-white/20 text-white cursor-default'
                        : 'bg-[#6cbe45] hover:bg-[#7ad150] text-black font-bold active:scale-95 shadow-md'
                    }`}
                  >
                    <span>{isSelected ? 'Active Line' : 'Switch Line'}</span>
                    {!isSelected && <ArrowRight className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer Guidance */}
        <div className="px-6 py-3 bg-[#101311] border-t border-white/5 text-[11px] text-[#9a9684] flex items-center justify-between">
          <span>Route switches take effect upon leaving the current haven station.</span>
          <span className="text-white/40 font-mono">COURT SQ-BOUND v5.2</span>
        </div>
      </div>
    </div>
  );
};
