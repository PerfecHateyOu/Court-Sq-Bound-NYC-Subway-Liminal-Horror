/**
 * Case Files Dossier Modal (Operation Skyward Phase 4)
 * Comprehensive transit archive with 4 dedicated tabs:
 * 1. Anomalies (13 cataloged anomalies with stats and classification)
 * 2. Polaroid Gallery (persistent developed prints with exposure stamp & zoom)
 * 3. Frequencies & Tapes (recorded broadcasts and secret station channels with audio player)
 * 4. Endings & Achievements (8 escape endings + career investigation badges)
 */
import React, { useState } from 'react';
import { X, Volume2, ShieldCheck, Eye, Award, Image as ImageIcon, Radio, CheckCircle2, Lock } from 'lucide-react';
import { GameEngine } from '../game/gameState';
import { PSYCH_CLASS, PSYCH_ENTRIES, PSYCH_IDS, entryState } from '../game/psychLog';
import { EVP_SIGNALS, loadEvpArchive, transcriptOf, EvpTape } from '../game/evpManager';
import { ENDINGS, ENDING_IDS, loadEndingsArchive, endingText } from '../game/endings';
import { loadPersistentPolaroids, polaroidManager } from '../game/polaroidManager';
import { ACHIEVEMENTS, ACHIEVEMENT_IDS, loadAchievements } from '../game/achievements';
import { TapePlayButton } from './TapePlayButton';
import { PolaroidPhoto } from '../types';

interface CaseFilesModalProps {
  engine?: GameEngine;
  onClose: () => void;
  initialTab?: 'anomalies' | 'polaroids' | 'tapes' | 'endings';
}

export const CaseFilesModal: React.FC<CaseFilesModalProps> = ({
  engine,
  onClose,
  initialTab = 'anomalies',
}) => {
  const [activeTab, setActiveTab] = useState<'anomalies' | 'polaroids' | 'tapes' | 'endings'>(initialTab);
  const [selectedPhoto, setSelectedPhoto] = useState<PolaroidPhoto | null>(null);

  const archive = engine?.psychLog?.archive ?? {};
  const documentedCount = PSYCH_IDS.filter((id) => entryState(archive[id]) === 'documented').length;

  const evpArchive = loadEvpArchive();
  const tapeCount = Object.keys(evpArchive).length;

  const endingsArchive = loadEndingsArchive();
  const endingCount = ENDING_IDS.filter((id) => !!endingsArchive[id]).length;

  const persistentPhotos = loadPersistentPolaroids();
  const currentPhotos = polaroidManager.photos ?? [];
  const allPhotos = [...currentPhotos, ...persistentPhotos].filter(
    (p, idx, arr) => arr.findIndex((x) => x.id === p.id) === idx
  );

  const achievements = loadAchievements();
  const unlockedAchievementsCount = ACHIEVEMENT_IDS.filter((id) => !!achievements[id]).length;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md"
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="case-files-title"
        className="w-full max-w-2xl max-h-[88vh] flex flex-col bg-[#e8e2cf] text-[#1b1d18] rounded-sm shadow-2xl border border-[#9f9883] overflow-hidden relative"
      >
        {/* Subtle scanline overlay */}
        <div className="absolute inset-0 pointer-events-none transit-sign-raster opacity-20" />

        {/* Header */}
        <div className="flex items-start justify-between border-b-2 border-[#1b1d18] p-4 sm:p-6 pb-3 relative z-10 bg-[#e8e2cf]">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#1b1d18] text-[#ece6d3] text-[10px] font-mono font-bold tracking-wider mb-1">
              <span className="w-3.5 h-3.5 rounded-full bg-[#6cbe45] text-[#1b1d18] font-black inline-flex items-center justify-center text-[9px]">
                G
              </span>
              MTA NYCTliminal ARCHIVE DOSSIER
            </div>
            <h2 id="case-files-title" className="text-2xl sm:text-3xl font-black uppercase tracking-tight leading-none">
              Case Files & Career Archive
            </h2>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#55574c] mt-1.5 font-medium">
              <span>Anomalies: <strong className="text-[#1b1d18]">{documentedCount}/13</strong></span>
              <span>·</span>
              <span>Tapes: <strong className="text-[#1b1d18]">{tapeCount}/{EVP_SIGNALS.length}</strong></span>
              <span>·</span>
              <span>Endings: <strong className="text-[#1b1d18]">{endingCount}/8</strong></span>
              <span>·</span>
              <span>Badges: <strong className="text-[#1b1d18]">{unlockedAchievementsCount}/{ACHIEVEMENT_IDS.length}</strong></span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-black/10 text-[#1b1d18] transition-colors"
            aria-label="Close Case Files"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 px-4 sm:px-6 pt-2 border-b border-[#c4bda7] bg-[#ded7c2] relative z-10 overflow-x-auto">
          <button
            onClick={() => setActiveTab('anomalies')}
            className={`px-3 py-2 text-xs font-bold uppercase tracking-wider border-b-2 transition-colors whitespace-nowrap inline-flex items-center gap-1.5 ${
              activeTab === 'anomalies'
                ? 'border-[#1b1d18] text-[#1b1d18] bg-[#e8e2cf]'
                : 'border-transparent text-[#6e6858] hover:text-[#1b1d18]'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            Anomalies ({documentedCount}/13)
          </button>
          <button
            onClick={() => setActiveTab('polaroids')}
            className={`px-3 py-2 text-xs font-bold uppercase tracking-wider border-b-2 transition-colors whitespace-nowrap inline-flex items-center gap-1.5 ${
              activeTab === 'polaroids'
                ? 'border-[#1b1d18] text-[#1b1d18] bg-[#e8e2cf]'
                : 'border-transparent text-[#6e6858] hover:text-[#1b1d18]'
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5" />
            Polaroid Album ({allPhotos.length})
          </button>
          <button
            onClick={() => setActiveTab('tapes')}
            className={`px-3 py-2 text-xs font-bold uppercase tracking-wider border-b-2 transition-colors whitespace-nowrap inline-flex items-center gap-1.5 ${
              activeTab === 'tapes'
                ? 'border-[#1b1d18] text-[#1b1d18] bg-[#e8e2cf]'
                : 'border-transparent text-[#6e6858] hover:text-[#1b1d18]'
            }`}
          >
            <Radio className="w-3.5 h-3.5" />
            Frequencies & Tapes ({tapeCount})
          </button>
          <button
            onClick={() => setActiveTab('endings')}
            className={`px-3 py-2 text-xs font-bold uppercase tracking-wider border-b-2 transition-colors whitespace-nowrap inline-flex items-center gap-1.5 ${
              activeTab === 'endings'
                ? 'border-[#1b1d18] text-[#1b1d18] bg-[#e8e2cf]'
                : 'border-transparent text-[#6e6858] hover:text-[#1b1d18]'
            }`}
          >
            <Award className="w-3.5 h-3.5" />
            Endings & Badges
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 relative z-10">
          {/* TAB 1: ANOMALIES */}
          {activeTab === 'anomalies' && (
            <ul className="divide-y divide-[#c4bda7] text-xs">
              {PSYCH_IDS.map((id) => {
                const def = PSYCH_ENTRIES[id];
                const state = entryState(archive[id]);
                const rec = archive[id];

                return (
                  <li key={id} className="py-2.5">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="font-mono font-bold text-[10px] text-[#55574c] uppercase tracking-wider">
                        Class {PSYCH_CLASS[def.tier]}
                      </span>
                      <div className="flex items-center gap-1.5">
                        {state === 'documented' && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#6cbe45]/30 text-[#204a18]">
                            DOCUMENTED
                          </span>
                        )}
                        {state === 'unconfirmed' && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#e3a83a]/30 text-[#6d4b0f]">
                            UNCONFIRMED
                          </span>
                        )}
                        {state === 'redacted' && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-black/10 text-[#55574c]">
                            REDACTED
                          </span>
                        )}
                      </div>
                    </div>

                    {state === 'documented' && (
                      <div className="mt-1">
                        <strong className="font-extrabold text-[#1b1d18] text-sm">{def.title}</strong>
                        <p className="mt-0.5 text-[#3a3b34] leading-relaxed">{def.note}</p>
                        <div className="mt-1 text-[10px] text-[#55574c]">
                          Encountered {rec.seen} time{rec.seen === 1 ? '' : 's'}, caught {rec.caught}.
                        </div>
                      </div>
                    )}

                    {state === 'unconfirmed' && (
                      <div className="mt-1">
                        <strong className="font-extrabold text-[#1b1d18] text-sm">{def.title}</strong>
                        <p className="mt-0.5 italic text-[#55574c] leading-relaxed">
                          Manifested before your eyes, but you failed to flag it in time. Notice what changes next time.
                        </p>
                      </div>
                    )}

                    {state === 'redacted' && (
                      <div className="mt-1 italic text-[#777468]">
                        [Anomaly parameters not yet witnessed]
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}

          {/* TAB 2: POLAROID GALLERY */}
          {activeTab === 'polaroids' && (
            <div>
              {allPhotos.length === 0 ? (
                <div className="py-12 text-center text-[#6e6858]">
                  <ImageIcon className="w-10 h-10 mx-auto mb-2 opacity-50" />
                  <p className="font-bold text-sm">No Polaroid Evidence Saved Yet</p>
                  <p className="text-xs mt-1 max-w-sm mx-auto">
                    Raise the Polaroid 600 during a ride (press P or tap Camera) and press the red shutter button to capture anomalies. Prints develop fully after each ride.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {allPhotos.map((photo) => (
                    <div
                      key={photo.id}
                      onClick={() => setSelectedPhoto(photo)}
                      className="cursor-pointer bg-[#f7f5ed] p-2 rounded shadow-md border border-[#c4bda7] hover:border-[#1b1d18] hover:shadow-lg transition-all text-center group"
                    >
                      <div className="aspect-square bg-[#1b1d18] rounded-sm overflow-hidden mb-1.5 relative flex items-center justify-center">
                        {photo.dataUrl ? (
                          <img
                            src={photo.dataUrl}
                            alt={`Polaroid at stop ${photo.stop}`}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-[10px] font-mono text-[#8d8371]">SILVER PRINT</span>
                        )}
                        {photo.hasAnomalyInFrustum && (
                          <span className="absolute top-1 right-1 px-1.5 py-0.5 bg-red-600 text-white font-mono text-[8px] font-bold rounded">
                            EVIDENCE
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] font-mono text-[#55574c] truncate">
                        Stop {photo.stop} · Car {photo.carIndex === 0 ? 'A' : photo.carIndex === 1 ? 'B' : 'C'}
                      </div>
                      <div className="text-[11px] font-bold text-[#1b1d18] truncate mt-0.5">
                        {photo.hasAnomalyInFrustum ? photo.anomalyName || 'Anomaly Caught' : 'Standard Car'}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Photo Zoom Modal */}
              {selectedPhoto && (
                <div
                  className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80"
                  onClick={() => setSelectedPhoto(null)}
                >
                  <div
                    className="bg-[#f7f5ed] p-4 sm:p-5 rounded-sm max-w-md w-full shadow-2xl border border-[#9f9883] text-[#1b1d18]"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="aspect-square bg-black rounded-sm overflow-hidden mb-3 flex items-center justify-center">
                      {selectedPhoto.dataUrl ? (
                        <img
                          src={selectedPhoto.dataUrl}
                          alt="Enlarged polaroid"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="font-mono text-sm text-[#8d8371]">Undeveloped Silver Print</span>
                      )}
                    </div>
                    <div className="flex items-center justify-between border-b border-[#c4bda7] pb-2 mb-2">
                      <span className="font-mono text-xs font-bold text-[#55574c]">
                        STOP {selectedPhoto.stop} // CAR {selectedPhoto.carIndex === 0 ? 'A' : selectedPhoto.carIndex === 1 ? 'B' : 'C'}
                      </span>
                      <span className="font-mono text-xs text-[#55574c]">
                        EXP {selectedPhoto.exposureQuality}%
                      </span>
                    </div>
                    <h3 className="font-bold text-base text-[#1b1d18]">
                      {selectedPhoto.hasAnomalyInFrustum
                        ? selectedPhoto.anomalyName || 'Verified Anomaly Evidence'
                        : 'Routine Commute'}
                    </h3>
                    <p className="text-xs text-[#55574c] mt-1 leading-relaxed">
                      {selectedPhoto.description || 'No unusual phenomena detected in frame.'}
                    </p>
                    <div className="mt-4 pt-2 border-t border-[#c4bda7] flex justify-end">
                      <button
                        onClick={() => setSelectedPhoto(null)}
                        className="px-3 py-1.5 bg-[#1b1d18] text-[#ece6d3] text-xs font-bold rounded"
                      >
                        Close Print
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: FREQUENCIES & TAPES */}
          {activeTab === 'tapes' && (
            <div className="space-y-3">
              <p className="text-xs text-[#55574c] leading-relaxed mb-3">
                Microcassette transmissions intercepted across 70–180 kHz. Audio tapes can be replayed through the recorder speaker.
              </p>
              <ul className="divide-y divide-[#c4bda7] text-xs">
                {EVP_SIGNALS.map((sig) => {
                  const entry = evpArchive[sig.id];
                  const discovered = !!entry;
                  const transcript = transcriptOf(sig);

                  // Create dummy tape object for player
                  const tapeObj: EvpTape = {
                    signalId: sig.id,
                    title: sig.title,
                    stop: `Stops ${sig.stops.join('-')}`,
                    freq: 'Carrier Wave',
                    transcript,
                    gt: 0,
                  };

                  return (
                    <li key={sig.id} className="py-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[10px] font-bold text-[#55574c] uppercase tracking-wider">
                              [{sig.category.toUpperCase()}]
                            </span>
                            {discovered ? (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-[#6cbe45]/30 text-[#204a18]">
                                CAPTURED ({entry.count}x)
                              </span>
                            ) : (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-black/10 text-[#55574c]">
                                UNDISCOVERED
                              </span>
                            )}
                          </div>
                          <h4 className="font-bold text-sm text-[#1b1d18] mt-0.5">{sig.title}</h4>
                        </div>
                        {discovered && engine && (
                          <TapePlayButton engine={engine} tape={tapeObj} tone="paper" />
                        )}
                      </div>

                      {discovered ? (
                        <div className="mt-2 p-2 rounded bg-black/5 border border-[#c4bda7] text-[11px] font-mono leading-relaxed text-[#2a2b25]">
                          “{transcript}”
                        </div>
                      ) : (
                        <p className="mt-1 text-xs italic text-[#777468]">
                          Broadcast signal not yet intercepted. Tune during Stops {sig.stops.join(', ')} to lock onto this frequency.
                        </p>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {/* TAB 4: ENDINGS & ACHIEVEMENTS */}
          {activeTab === 'endings' && (
            <div className="space-y-6">
              {/* Escape Endings Section */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-black text-sm uppercase tracking-tight text-[#1b1d18]">
                    Classified Escape Endings ({endingCount} of 8 Unlocked)
                  </h3>
                  <span className="font-mono text-xs text-[#55574c]">
                    {Math.round((endingCount / 8) * 100)}% COMPLETE
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {ENDING_IDS.map((id) => {
                    const def = ENDINGS[id];
                    const entry = endingsArchive[id];
                    const isReached = !!entry;
                    const text = endingText(def);

                    return (
                      <div
                        key={id}
                        className={`p-2.5 rounded border transition-all ${
                          isReached
                            ? 'bg-white/70 border-[#1b1d18]/40 text-[#1b1d18]'
                            : 'bg-black/5 border-dashed border-[#c4bda7] text-[#777468]'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1 mb-1">
                          <span className="font-mono font-bold text-[9px] uppercase tracking-wider text-[#55574c]">
                            {def.badge}
                          </span>
                          {isReached ? (
                            <span className="font-mono text-[9px] font-bold text-[#204a18]">
                              REACHED {entry.count}x
                            </span>
                          ) : (
                            <Lock className="w-3 h-3 text-[#8d8371]" />
                          )}
                        </div>
                        <h4 className="font-bold text-xs text-[#1b1d18]">{def.title}</h4>
                        <p className="mt-1 text-[11px] leading-snug">
                          {isReached ? text.summary : '[Parameters unfulfilled or undiscovered]'}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Career Achievements Section */}
              <div className="pt-4 border-t border-[#c4bda7]">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-black text-sm uppercase tracking-tight text-[#1b1d18]">
                    Investigation Career Badges ({unlockedAchievementsCount} of {ACHIEVEMENT_IDS.length})
                  </h3>
                  <span className="font-mono text-xs text-[#55574c]">
                    {Math.round((unlockedAchievementsCount / ACHIEVEMENT_IDS.length) * 100)}% UNLOCKED
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {ACHIEVEMENT_IDS.map((id) => {
                    const ach = ACHIEVEMENTS[id];
                    const unlocked = !!achievements[id];

                    return (
                      <div
                        key={id}
                        className={`p-2.5 rounded border flex items-start gap-2.5 transition-all ${
                          unlocked
                            ? 'bg-white/80 border-[#6cbe45] text-[#1b1d18] shadow-sm'
                            : 'bg-black/5 border-[#c4bda7] text-[#777468]'
                        }`}
                      >
                        <div
                          className={`w-7 h-7 shrink-0 rounded flex items-center justify-center font-mono font-black text-[10px] ${
                            unlocked
                              ? 'bg-[#1b1d18] text-[#6cbe45]'
                              : 'bg-black/10 text-[#8d8371]'
                          }`}
                        >
                          {ach.badge}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <h4 className="font-bold text-xs truncate text-[#1b1d18]">{ach.title}</h4>
                            {unlocked && (
                              <CheckCircle2 className="w-3.5 h-3.5 text-[#6cbe45] shrink-0" />
                            )}
                          </div>
                          <p className="mt-0.5 text-[11px] leading-snug text-[#55574c]">
                            {ach.description}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 sm:p-4 border-t border-[#9f9883] bg-[#ded7c2] flex justify-end relative z-10">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-[#1b1d18] hover:bg-[#2e312b] text-[#ece6d3] text-xs font-bold rounded transition-colors"
          >
            Return to Briefing
          </button>
        </div>
      </div>
    </div>
  );
};
