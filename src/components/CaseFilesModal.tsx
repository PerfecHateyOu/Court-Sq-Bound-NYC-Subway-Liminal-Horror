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
import { PSYCH_CLASS, PSYCH_ENTRIES, PSYCH_IDS, entryState, loadArchive } from '../game/psychLog';
import { EVP_SIGNALS, loadEvpArchive, transcriptOf, titleOf, EvpTape } from '../game/evpManager';
import { ENDINGS, ENDING_IDS, loadEndingsArchive, endingText } from '../game/endings';
import { loadPersistentPolaroids, polaroidManager } from '../game/polaroidManager';
import { ACHIEVEMENTS, ACHIEVEMENT_IDS, loadAchievements } from '../game/achievements';
import { TapePlayButton } from './TapePlayButton';
import { Overlay } from '../ui/Overlay';
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
  // Esc closes an enlarged print first (its own Overlay is on top), then the Case Files.

  // What's saved on this device (the last ride's result only exists after a ride ends).
  const archive = loadArchive();
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
    <>
    <Overlay
      onClose={onClose}
      labelledBy="case-files-title"
      width="2xl"
      layer={50}
      backdropClassName="bg-black/85 backdrop-blur-md"
      panelClassName="bg-paper text-paper-ink rounded-sm border border-paper-faint"
      bodyClassName="p-4 sm:p-6"
      testId="case-files"
      header={
        <>
        {/* Header */}
        <div className="flex items-start justify-between border-b-2 border-paper-ink p-4 sm:p-6 pb-3 relative z-10 bg-paper">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-paper-ink text-cream text-3xs font-mono font-bold tracking-wider mb-1">
              <span className="w-3.5 h-3.5 rounded-full bg-g-line text-paper-ink font-black inline-flex items-center justify-center text-4xs">
                G
              </span>
              ARCHIVE DOSSIER
            </div>
            <h2 id="case-files-title" className="text-fluid-2xl font-black uppercase tracking-tight leading-none">
              Case Files & Career Archive
            </h2>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-paper-dim mt-1.5 font-medium">
              <span>Anomalies: <strong className="text-paper-ink">{documentedCount}/13</strong></span>
              <span>·</span>
              <span>Tapes: <strong className="text-paper-ink">{tapeCount}/{EVP_SIGNALS.length}</strong></span>
              <span>·</span>
              <span>Endings: <strong className="text-paper-ink">{endingCount}/8</strong></span>
              <span>·</span>
              <span>Badges: <strong className="text-paper-ink">{unlockedAchievementsCount}/{ACHIEVEMENT_IDS.length}</strong></span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-black/10 text-paper-ink transition-colors"
            aria-label="Close Case Files"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation: 2×2 on phones, one row from 640px, with short labels so none clip */}
        <div
          role="tablist"
          aria-label="Case Files sections"
          className="grid grid-cols-2 sm:grid-cols-4 gap-px px-4 sm:px-6 pt-2 border-b border-paper-line bg-paper-2 relative z-10"
        >
          {(
            [
              ['anomalies', 'Anomalies', `${documentedCount}/13`, Eye],
              ['polaroids', 'Polaroids', `${allPhotos.length}`, ImageIcon],
              ['tapes', 'Tapes', `${tapeCount}`, Radio],
              ['endings', 'Endings', `${endingCount}/8`, Award],
            ] as const
          ).map(([id, label, count, Icon]) => {
            const on = activeTab === id;
            return (
              <button
                key={id}
                role="tab"
                id={`cf-tab-${id}`}
                aria-selected={on}
                aria-controls="cf-panel"
                onClick={() => setActiveTab(id)}
                className={`tap min-w-0 px-2 py-2 text-xs uppercase tracking-wider border-b-2 transition-colors whitespace-nowrap inline-flex items-center justify-center gap-1.5 ${
                  on ? 'border-paper-ink text-paper-ink font-black bg-paper' : 'border-transparent text-paper-mute font-bold hover:text-paper-ink'
                }`}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span>{label}</span>
                <span className="font-mono text-3xs tabular-nums opacity-80">{count}</span>
              </button>
            );
          })}
        </div>

        </>
      }
      footer={
        <div className="p-3 sm:p-4 border-t border-paper-faint bg-paper-2 flex justify-end relative z-10">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-paper-ink hover:bg-[#2e312b] text-cream text-xs font-bold rounded transition-colors"
          >
            Return to Briefing
          </button>
        </div>
      }
    >
        {/* Subtle scanline overlay */}
        <div className="absolute inset-0 pointer-events-none transit-sign-raster opacity-20" />
        <div id="cf-panel" role="tabpanel" aria-labelledby={`cf-tab-${activeTab}`} className="relative z-10">
          {/* TAB 1: ANOMALIES */}
          {activeTab === 'anomalies' && (
            <ul className="divide-y divide-paper-line text-xs">
              {PSYCH_IDS.map((id) => {
                const def = PSYCH_ENTRIES[id];
                const state = entryState(archive[id]);
                const rec = archive[id];

                return (
                  <li key={id} className="py-2.5">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="font-mono font-bold text-3xs text-paper-dim uppercase tracking-wider">
                        Class {PSYCH_CLASS[def.tier]}
                      </span>
                      <div className="flex items-center gap-1.5">
                        {state === 'documented' && (
                          <span className="px-1.5 py-0.5 rounded text-3xs font-bold bg-g-line/30 text-g-deep">
                            DOCUMENTED
                          </span>
                        )}
                        {state === 'unconfirmed' && (
                          <span className="px-1.5 py-0.5 rounded text-3xs font-bold bg-warn/30 text-[#6d4b0f]">
                            UNCONFIRMED
                          </span>
                        )}
                        {state === 'redacted' && (
                          <span className="px-1.5 py-0.5 rounded text-3xs font-bold bg-black/10 text-paper-dim">
                            REDACTED
                          </span>
                        )}
                      </div>
                    </div>

                    {state === 'documented' && (
                      <div className="mt-1">
                        <strong className="font-extrabold text-paper-ink text-sm">{def.title}</strong>
                        <p className="mt-0.5 text-[#3a3b34] leading-relaxed">{def.note}</p>
                        <div className="mt-1 text-3xs text-paper-dim">
                          Encountered {rec.seen} time{rec.seen === 1 ? '' : 's'}, caught {rec.caught}.
                        </div>
                      </div>
                    )}

                    {state === 'unconfirmed' && (
                      <div className="mt-1">
                        <strong className="font-extrabold text-paper-ink text-sm">{def.title}</strong>
                        <p className="mt-0.5 italic text-paper-dim leading-relaxed">
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
                <div className="py-12 text-center text-paper-mute">
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
                      className="cursor-pointer bg-[#f7f5ed] p-2 rounded shadow-md border border-paper-line hover:border-paper-ink hover:shadow-lg transition-all text-center group"
                    >
                      <div className="aspect-square bg-paper-ink rounded-sm overflow-hidden mb-1.5 relative flex items-center justify-center">
                        {photo.dataUrl ? (
                          <img
                            src={photo.dataUrl}
                            alt={`Polaroid at stop ${photo.stop}`}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-3xs font-mono text-faint">SILVER PRINT</span>
                        )}
                        {photo.hasAnomalyInFrustum && (
                          <span className="absolute top-1 right-1 px-1.5 py-0.5 bg-red-600 text-white font-mono text-[8px] font-bold rounded">
                            EVIDENCE
                          </span>
                        )}
                      </div>
                      <div className="text-3xs font-mono text-paper-dim truncate">
                        Stop {photo.stop} · Car {photo.carIndex === 0 ? 'A' : photo.carIndex === 1 ? 'B' : 'C'}
                      </div>
                      <div className="text-2xs font-bold text-paper-ink truncate mt-0.5">
                        {photo.hasAnomalyInFrustum ? photo.anomalyName || 'Anomaly Caught' : 'Standard Car'}
                      </div>
                    </div>
                  ))}
                </div>
              )}

            </div>
          )}

          {/* TAB 3: FREQUENCIES & TAPES */}
          {activeTab === 'tapes' && (
            <div className="space-y-3">
              <p className="text-xs text-paper-dim leading-relaxed mb-3">
                Microcassette transmissions intercepted across 70–180 kHz. Audio tapes can be replayed through the recorder speaker.
              </p>
              <ul className="divide-y divide-paper-line text-xs">
                {EVP_SIGNALS.map((sig) => {
                  const entry = evpArchive[sig.id];
                  const discovered = !!entry;
                  const transcript = transcriptOf(sig);

                  // Create dummy tape object for player
                  const tapeObj: EvpTape = {
                    signalId: sig.id,
                    title: titleOf(sig),
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
                            <span className="font-mono text-3xs font-bold text-paper-dim uppercase tracking-wider">
                              [{sig.category.toUpperCase()}]
                            </span>
                            {discovered ? (
                              <span className="px-1.5 py-0.2 rounded text-4xs font-bold bg-g-line/30 text-g-deep">
                                CAPTURED ({entry.count}x)
                              </span>
                            ) : (
                              <span className="px-1.5 py-0.2 rounded text-4xs font-bold bg-black/10 text-paper-dim">
                                UNDISCOVERED
                              </span>
                            )}
                          </div>
                          <h4 className="font-bold text-sm text-paper-ink mt-0.5">{titleOf(sig)}</h4>
                        </div>
                        {discovered && engine && (
                          <TapePlayButton engine={engine} tape={tapeObj} tone="paper" />
                        )}
                      </div>

                      {discovered ? (
                        <div className="mt-2 p-2 rounded bg-black/5 border border-paper-line text-2xs font-mono leading-relaxed text-[#2a2b25]">
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
                  <h3 className="font-black text-sm uppercase tracking-tight text-paper-ink">
                    Classified Escape Endings ({endingCount} of {ENDING_IDS.length} Unlocked)
                  </h3>
                  <span className="font-mono text-xs text-paper-dim">
                    {Math.round((endingCount / ENDING_IDS.length) * 100)}% COMPLETE
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
                            ? 'bg-white/70 border-paper-ink/40 text-paper-ink'
                            : 'bg-black/5 border-dashed border-paper-line text-[#777468]'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1 mb-1">
                          <span className="font-mono font-bold text-4xs uppercase tracking-wider text-paper-dim">
                            {isReached ? def.badge : '[REDACTED]'}
                          </span>
                          {isReached ? (
                            <span className="font-mono text-4xs font-bold text-g-deep">
                              REACHED {entry.count}x
                            </span>
                          ) : (
                            <Lock className="w-3 h-3 text-faint" />
                          )}
                        </div>
                        <h4 className="font-bold text-xs text-paper-ink">{isReached ? def.title : 'Undocumented Outcome'}</h4>
                        {isReached && <p className="mt-1 text-2xs leading-snug">{text.summary}</p>}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Career Achievements Section */}
              <div className="pt-4 border-t border-paper-line">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-black text-sm uppercase tracking-tight text-paper-ink">
                    Investigation Career Badges ({unlockedAchievementsCount} of {ACHIEVEMENT_IDS.length})
                  </h3>
                  <span className="font-mono text-xs text-paper-dim">
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
                            ? 'bg-white/80 border-g-line text-paper-ink shadow-sm'
                            : 'bg-black/5 border-paper-line text-[#777468]'
                        }`}
                      >
                        <div
                          className={`w-7 h-7 shrink-0 rounded flex items-center justify-center font-mono font-black text-3xs ${
                            unlocked
                              ? 'bg-paper-ink text-g-line'
                              : 'bg-black/10 text-faint'
                          }`}
                        >
                          {unlocked || !ach.secret ? ach.badge : '?'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <h4 className="font-bold text-xs truncate text-paper-ink">{unlocked || !ach.secret ? ach.title : '???'}</h4>
                            {unlocked && (
                              <CheckCircle2 className="w-3.5 h-3.5 text-g-line shrink-0" />
                            )}
                          </div>
                          <p className="mt-0.5 text-2xs leading-snug text-paper-dim">
                            {unlocked ? ach.description : 'Not yet earned.'}
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

    </Overlay>
      {/* An enlarged print, on top of the files (Esc or the backdrop closes it first). */}
      {selectedPhoto && (
        <Overlay
          onClose={() => setSelectedPhoto(null)}
          labelledBy="cf-print-title"
          width="md"
          layer={60}
          sheet={false}
          backdropClassName="bg-black/80"
          panelClassName="bg-[#f7f5ed] rounded-sm border border-paper-faint text-paper-ink"
          bodyClassName="p-4 sm:p-5"
          testId="case-files-print"
        >
          <div className="aspect-square max-h-[60dvh] mx-auto bg-black rounded-sm overflow-hidden mb-3 flex items-center justify-center">
            {selectedPhoto.dataUrl ? (
              <img src={selectedPhoto.dataUrl} alt="Enlarged polaroid" className="w-full h-full object-cover" />
            ) : (
              <span className="font-mono text-sm text-faint">Undeveloped Silver Print</span>
            )}
          </div>
          <div className="flex items-center justify-between border-b border-paper-line pb-2 mb-2">
            <span className="font-mono text-xs font-bold text-paper-dim">
              STOP {selectedPhoto.stop} // CAR {selectedPhoto.carIndex === 0 ? 'A' : selectedPhoto.carIndex === 1 ? 'B' : 'C'}
            </span>
            <span className="font-mono text-xs text-paper-dim">EXP {selectedPhoto.exposureQuality}%</span>
          </div>
          <h3 id="cf-print-title" className="font-bold text-base text-paper-ink">
            {selectedPhoto.hasAnomalyInFrustum ? selectedPhoto.anomalyName || 'Verified Anomaly Evidence' : 'Routine Commute'}
          </h3>
          <p className="text-xs text-paper-dim mt-1 leading-relaxed">
            {selectedPhoto.description || 'No unusual phenomena detected in frame.'}
          </p>
          <div className="mt-4 pt-2 border-t border-paper-line flex justify-end">
            <button
              autoFocus
              onClick={() => setSelectedPhoto(null)}
              className="tap px-3 py-1.5 bg-paper-ink text-cream text-xs font-bold rounded"
            >
              Close Print
            </button>
          </div>
        </Overlay>
      )}
    </>
  );
};