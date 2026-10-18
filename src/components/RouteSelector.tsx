/**
 * Branching MTA Route Selector
 * Allows switching between G (Brooklyn-Queens Crosstown), L (Canarsie), and 7 (Flushing) lines.
 */
import React from 'react';
import { routeManager, ROUTES } from '../game/routeManager';
import { TransitLineRoute } from '../types';
import { X, CheckCircle2, GitBranch } from 'lucide-react';

interface RouteSelectorProps {
  onClose: () => void;
  onSelectRoute: (route: TransitLineRoute) => void;
}

export const RouteSelector: React.FC<RouteSelectorProps> = ({
  onClose,
  onSelectRoute,
}) => {
  const activeRouteId = routeManager.routeId;
  const lineKeys: Array<'G' | 'L' | '7'> = ['G', 'L', '7'];

  const handleSelect = (lineKey: 'G' | 'L' | '7') => {
    routeManager.setRoute(lineKey);
    onSelectRoute(ROUTES[lineKey]);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-[#18191a] text-[#ece6d3] border border-white/20 rounded-md p-5 shadow-2xl flex flex-col gap-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <GitBranch className="w-5 h-5 text-[#6cbe45]" />
            <h2 className="text-xl font-bold tracking-tight text-white">
              Subway Line Selection
            </h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close route selector"
            className="p-1 rounded hover:bg-white/10 text-white/70 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-xs text-[#9a9684] leading-relaxed">
          Switching lines shifts physical tracks, station stops, passenger demeanor, and anomalous frequency.
        </p>

        {/* Route options */}
        <div className="flex flex-col gap-3">
          {lineKeys.map((key) => {
            const r = ROUTES[key];
            const isSelected = activeRouteId === key;

            return (
              <div
                key={key}
                onClick={() => handleSelect(key)}
                className={`p-3.5 rounded border transition-all cursor-pointer flex items-start gap-3 ${
                  isSelected
                    ? 'bg-white/10 border-white/40 ring-1 ring-white/30'
                    : 'bg-black/40 border-white/10 hover:border-white/25 hover:bg-white/5'
                }`}
              >
                <span
                  className="w-9 h-9 rounded-full font-black text-base flex items-center justify-center shrink-0 shadow-md"
                  style={{ backgroundColor: r.bulletColor, color: r.bulletTextColor }}
                >
                  {r.id}
                </span>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-sm text-white">{r.name}</h3>
                    {isSelected && (
                      <CheckCircle2 className="w-4 h-4 text-[#6cbe45] shrink-0" />
                    )}
                  </div>
                  <p className="text-xs text-[#9a9684] mt-0.5 leading-relaxed">
                    {r.description}
                  </p>
                  <div className="text-[10px] font-mono text-white/50 mt-1">
                    {r.stops.length - 1} STOPS // ANOMALY MULTIPLIER: {r.anomalyFrequency}x
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="border-t border-white/10 pt-3 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded transition-colors"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
};
