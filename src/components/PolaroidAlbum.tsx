/**
 * Polaroid Evidence Photo Album Drawer
 * Shows captured snapshots from the current ride and archival prints from previous runs.
 */
import React, { useState } from 'react';
import { GameEngine } from '../game/gameState';
import { polaroidManager, loadPersistentPolaroids } from '../game/polaroidManager';
import { PolaroidPhoto } from '../types';
import { X, Image as ImageIcon, Sparkles } from 'lucide-react';

interface PolaroidAlbumProps {
  engine?: GameEngine;
  onClose: () => void;
}

export const PolaroidAlbum: React.FC<PolaroidAlbumProps> = ({ onClose }) => {
  const [selectedPhoto, setSelectedPhoto] = useState<PolaroidPhoto | null>(null);

  const currentPhotos = polaroidManager.photos || [];
  const persistentPhotos = loadPersistentPolaroids();
  const allPhotos = [...currentPhotos, ...persistentPhotos].filter(
    (p, idx, arr) => arr.findIndex((x) => x.id === p.id) === idx
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl max-h-[85vh] bg-[#f7f5ed] text-[#1b1d18] rounded border border-[#9f9883] shadow-2xl flex flex-col overflow-hidden relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#c4bda7] p-4 bg-[#ece6d3]">
          <div className="flex items-center gap-2">
            <ImageIcon className="w-5 h-5 text-[#6cbe45]" />
            <h2 className="font-bold text-lg text-[#1b1d18] tracking-tight">
              Polaroid Evidence Album
            </h2>
            <span className="text-xs font-mono bg-black/10 px-2 py-0.5 rounded text-[#55574c]">
              {allPhotos.length} PRINTS
            </span>
          </div>
          <button
            onClick={onClose}
            aria-label="Close album"
            className="p-1 rounded hover:bg-black/10 transition-colors"
          >
            <X className="w-5 h-5 text-[#1b1d18]" />
          </button>
        </div>

        {/* Gallery Grid */}
        <div className="flex-1 overflow-y-auto p-4">
          {allPhotos.length === 0 ? (
            <div className="h-48 flex flex-col items-center justify-center text-[#8d8371] text-center gap-2">
              <Sparkles className="w-8 h-8 opacity-40" />
              <p className="text-sm font-medium">No photos taken yet this commute.</p>
              <p className="text-xs">Press [C] on the train to equip the camera and snap evidence.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {allPhotos.map((photo) => (
                <div
                  key={photo.id}
                  onClick={() => setSelectedPhoto(photo)}
                  className="bg-white p-2 pb-3 rounded shadow hover:shadow-md transition-all cursor-pointer border border-[#c4bda7] group flex flex-col"
                >
                  <div className="aspect-square bg-black rounded-sm overflow-hidden mb-2 flex items-center justify-center relative">
                    {photo.dataUrl ? (
                      <img
                        src={photo.dataUrl}
                        alt="Polaroid thumbnail"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                    ) : (
                      <span className="text-[10px] font-mono text-[#8d8371]">Developing…</span>
                    )}
                  </div>
                  <div className="text-[10px] font-mono text-[#55574c]">
                    STOP {photo.stop} // CAR {photo.carIndex === 0 ? 'A' : photo.carIndex === 1 ? 'B' : 'C'}
                  </div>
                  <div className="text-xs font-bold text-[#1b1d18] truncate mt-0.5">
                    {photo.developed
                      ? photo.hasAnomalyInFrustum
                        ? photo.anomalyName || 'Anomaly Caught'
                        : 'Routine Commute'
                      : 'Silver Print (Exposed)'}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Single Photo Zoom Modal */}
        {selectedPhoto && (
          <div
            className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/85"
            onClick={() => setSelectedPhoto(null)}
          >
            <div
              className="bg-[#f7f5ed] p-5 rounded max-w-sm w-full border border-[#9f9883] text-[#1b1d18]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="aspect-square bg-black rounded overflow-hidden mb-3 flex items-center justify-center">
                {selectedPhoto.dataUrl ? (
                  <img
                    src={selectedPhoto.dataUrl}
                    alt="Enlarged polaroid"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="font-mono text-sm text-[#8d8371]">Undeveloped Print</span>
                )}
              </div>
              <div className="font-mono text-xs text-[#55574c] mb-1">
                STOP {selectedPhoto.stop} // EXP {selectedPhoto.exposureQuality}%
              </div>
              <h3 className="font-bold text-base text-[#1b1d18]">
                {selectedPhoto.developed
                  ? selectedPhoto.hasAnomalyInFrustum
                    ? selectedPhoto.anomalyName || 'Verified Anomaly Evidence'
                    : 'Routine Commute'
                  : 'Exposed Film (Develops post-ride)'}
              </h3>
              <p className="text-xs text-[#55574c] mt-1 leading-relaxed">
                {selectedPhoto.developed
                  ? selectedPhoto.description || 'No unusual phenomena detected in frame.'
                  : 'Photochemical silver emulsion will develop fully upon reaching terminal.'}
              </p>
              <div className="mt-4 pt-2 border-t border-[#c4bda7] flex justify-end">
                <button
                  onClick={() => setSelectedPhoto(null)}
                  className="px-3 py-1.5 bg-[#1b1d18] text-[#ece6d3] text-xs font-bold rounded"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
