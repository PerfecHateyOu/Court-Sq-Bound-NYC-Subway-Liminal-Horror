/**
 * Polaroid Evidence Photo Album
 * Slide-out retro photo drawer. During the ride the prints are still developing (blank frames,
 * no captions), so the album never tells the player what a shot caught. They develop after
 * the ride; the report shows them.
 */
import React, { useState } from 'react';
import { polaroidManager } from '../game/polaroidManager';
import { PolaroidPhoto } from '../types';
import { X, Image as ImageIcon, Sparkles, CheckCircle2, AlertTriangle, ZoomIn } from 'lucide-react';

interface PolaroidAlbumProps {
  onClose: () => void;
}

export const PolaroidAlbum: React.FC<PolaroidAlbumProps> = ({ onClose }) => {
  const [selectedPhoto, setSelectedPhoto] = useState<PolaroidPhoto | null>(null);
  const [filter, setFilter] = useState<'all' | 'anomalies' | 'carA' | 'carB' | 'carC'>('all');

  const photos = polaroidManager.photos;
  const developed = photos.length > 0 && photos.every((p) => p.developed);

  const filteredPhotos = photos.filter((p) => {
    if (filter === 'anomalies') return p.hasAnomalyInFrustum;
    if (filter === 'carA') return p.carIndex === 0;
    if (filter === 'carB') return p.carIndex === 1;
    if (filter === 'carC') return p.carIndex === 2;
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md select-none animate-in fade-in duration-200">
      {/* Album Container */}
      <div className="relative w-full max-w-4xl max-h-[90vh] flex flex-col bg-[#141715] border border-white/15 rounded-xl shadow-2xl overflow-hidden">
        {/* Header Bar */}
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-[#191d1a]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#e3a83a]/15 border border-[#e3a83a]/30 flex items-center justify-center text-[#e3a83a]">
              <ImageIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-base sm:text-lg text-[#ece6d3] tracking-tight">
                Polaroid Evidence Album
              </h2>
              <p className="text-xs text-[#9a9684]">
                {developed
                  ? `${photos.length} prints • ${photos.filter((p) => p.hasAnomalyInFrustum).length} caught something`
                  : `${photos.length} print${photos.length === 1 ? '' : 's'} • they develop after the ride`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              aria-label="Close Album"
              className="w-9 h-9 rounded-lg bg-black/50 border border-white/10 hover:bg-black/80 flex items-center justify-center text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filter Navigation Bar */}
        <div className="px-6 py-2.5 bg-[#101311] border-b border-white/5 flex flex-wrap gap-2 text-xs">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 rounded-full font-medium transition-colors ${
              filter === 'all'
                ? 'bg-[#ece6d3] text-black font-semibold'
                : 'bg-white/5 hover:bg-white/10 text-[#9a9684]'
            }`}
          >
            All Prints ({photos.length})
          </button>

{developed && (
          <button
            onClick={() => setFilter('anomalies')}
            className={`px-3 py-1.5 rounded-full font-medium transition-colors flex items-center gap-1.5 ${
              filter === 'anomalies'
                ? 'bg-red-600 text-white font-semibold'
                : 'bg-red-950/40 hover:bg-red-900/40 text-red-300 border border-red-500/20'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Anomalies Only ({photos.filter((p) => p.hasAnomalyInFrustum).length})</span>
          </button>
          )}

          <button
            onClick={() => setFilter('carA')}
            className={`px-3 py-1.5 rounded-full font-medium transition-colors ${
              filter === 'carA'
                ? 'bg-[#ece6d3] text-black font-semibold'
                : 'bg-white/5 hover:bg-white/10 text-[#9a9684]'
            }`}
          >
            Car A (Lead)
          </button>

          <button
            onClick={() => setFilter('carB')}
            className={`px-3 py-1.5 rounded-full font-medium transition-colors ${
              filter === 'carB'
                ? 'bg-[#ece6d3] text-black font-semibold'
                : 'bg-white/5 hover:bg-white/10 text-[#9a9684]'
            }`}
          >
            Car B (Mid)
          </button>

          <button
            onClick={() => setFilter('carC')}
            className={`px-3 py-1.5 rounded-full font-medium transition-colors ${
              filter === 'carC'
                ? 'bg-[#ece6d3] text-black font-semibold'
                : 'bg-white/5 hover:bg-white/10 text-[#9a9684]'
            }`}
          >
            Car C (Rear)
          </button>
        </div>

        {/* Photos Grid Content Area */}
        <div className="flex-1 overflow-y-auto p-6">
          {filteredPhotos.length === 0 ? (
            <div className="py-20 text-center flex flex-col items-center justify-center text-[#9a9684]">
              <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-3">
                <ImageIcon className="w-8 h-8 opacity-40" />
              </div>
              <p className="text-sm font-medium">No Polaroid prints in this category yet.</p>
              <p className="text-xs text-white/40 mt-1">
                Press [C] or click the camera icon on the HUD to frame and capture evidence.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 sm:gap-6">
              {filteredPhotos.map((photo) => (
                <div
                  key={photo.id}
                  onClick={() => setSelectedPhoto(photo)}
                  className="group relative cursor-pointer bg-[#f4efe6] p-2.5 pb-4 rounded shadow-lg border border-black/30 hover:scale-[1.03] transition-all duration-200 text-black flex flex-col"
                >
                  {/* Square Print Image */}
                  <div className="relative aspect-square w-full bg-[#181816] rounded-sm overflow-hidden border border-black/20">
                    {photo.developed ? (
                      <img
                        src={photo.dataUrl}
                        alt="Polaroid Evidence"
                        className="w-full h-full object-cover filter contrast-105"
                      />
                    ) : (
                      <UndevelopedPrint />
                    )}

                    {/* Badge (developed prints only) */}
                    {!photo.developed ? null : photo.hasAnomalyInFrustum ? (
                      <div className="absolute top-1.5 right-1.5 bg-red-600 text-white text-[8px] font-mono font-bold px-1.5 py-0.5 rounded shadow flex items-center gap-0.5">
                        <Sparkles className="w-2.5 h-2.5" />
                        <span>ANOMALY</span>
                      </div>
                    ) : (
                      <div className="absolute top-1.5 right-1.5 bg-black/60 text-white/80 text-[8px] font-mono px-1.5 py-0.5 rounded">
                        BASELINE
                      </div>
                    )}

                    {/* Hover Zoom Prompt */}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                      <ZoomIn className="w-6 h-6" />
                    </div>
                  </div>

                  {/* Caption Strip */}
                  <div className="mt-2 text-center">
                    <div className="text-[11px] font-bold font-mono truncate text-gray-800">
                      {photo.developed ? photo.anomalyName || 'Nothing out of place' : 'Developing…'}
                    </div>
                    <div className="text-[9px] font-mono text-gray-500">
                      Car {photo.carIndex === 0 ? 'A (Lead)' : photo.carIndex === 2 ? 'C (Rear)' : 'B (Mid)'} • Line {photo.routeId}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Single Photo Inspection Lightbox Modal */}
      {selectedPhoto && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/90 backdrop-blur-lg animate-in zoom-in-95 duration-200">
          <div className="relative max-w-lg w-full bg-[#f4efe6] p-4 pb-6 rounded-lg shadow-2xl text-black border border-black/30">
            {/* Close button */}
            <button
              onClick={() => setSelectedPhoto(null)}
              className="absolute -top-12 right-0 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Print Photo */}
            <div className="relative aspect-square w-full bg-[#181816] rounded overflow-hidden border border-black/25">
              {selectedPhoto.developed ? (
                <img
                  src={selectedPhoto.dataUrl}
                  alt="Selected Evidence"
                  className="w-full h-full object-cover filter contrast-110"
                />
              ) : (
                <UndevelopedPrint large />
              )}
            </div>

            {/* Inspection Technical Details */}
            <div className="mt-4 font-mono">
              <div className="flex items-center justify-between pb-2 border-b border-black/15">
                <span className="font-bold text-sm tracking-tight text-gray-900">
                  {selectedPhoto.developed ? selectedPhoto.anomalyName || 'NOTHING OUT OF PLACE' : 'STILL DEVELOPING'}
                </span>
                {selectedPhoto.developed && (
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1 ${
                    selectedPhoto.hasAnomalyInFrustum
                      ? 'bg-red-600 text-white'
                      : 'bg-emerald-700 text-white'
                  }`}
                >
                  {selectedPhoto.hasAnomalyInFrustum ? (
                    <>
                      <AlertTriangle className="w-3 h-3" />
                      ANOMALOUS
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-3 h-3" />
                      NEGATIVE
                    </>
                  )}
                </span>
                )}
              </div>

              <div className="mt-2.5 grid grid-cols-2 gap-2 text-xs text-gray-700">
                <div>
                  <span className="text-gray-500 text-[10px] block">CONSIST CAR LOCATION</span>
                  <span className="font-semibold">
                    {selectedPhoto.carIndex === 0
                      ? 'Car A (Lead Car)'
                      : selectedPhoto.carIndex === 2
                      ? 'Car C (Rear Car)'
                      : 'Car B (Center Car)'}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500 text-[10px] block">MTA TRANSIT LINE</span>
                  <span className="font-semibold">{selectedPhoto.routeId} Line</span>
                </div>
              </div>

              <p className="mt-3 text-xs text-gray-600 leading-relaxed bg-black/5 p-2.5 rounded border border-black/10">
                {selectedPhoto.developed
                  ? selectedPhoto.description || 'Evidentiary photo captured on Polaroid 600 emulsion.'
                  : 'Polaroid 600 prints take their time. This one will be ready at the end of the ride.'}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/** A print that hasn't developed yet: the grey-green of fresh Polaroid emulsion, nothing else. */
const UndevelopedPrint: React.FC<{ large?: boolean }> = ({ large }) => (
  <div
    className="w-full h-full flex items-center justify-center"
    style={{ background: 'radial-gradient(circle at 40% 35%, #4a4a42 0%, #34352f 55%, #26272233 100%), #2b2c27' }}
    aria-label="Undeveloped print"
  >
    <span className={`font-mono tracking-[0.3em] text-white/25 ${large ? 'text-xs' : 'text-[8px]'}`}>DEVELOPING</span>
  </div>
);
