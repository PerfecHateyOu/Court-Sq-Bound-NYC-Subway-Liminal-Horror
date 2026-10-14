/**
 * Travel Report / Evaluation Screen for Court Sq-Bound
 * Detailed psychological evaluation styled like an authentic NYC transit receipt.
 * Evaluates Sanity Retained, Mask Integrity, Anomaly Accuracy, and reveals endings.
 */
import React from 'react';
import { GameEngine } from '../game/gameState';
import { RunHistoryRecord, StopLogRecord } from '../types';
import { RESTRAINT_RAISE } from '../constants';
import { RotateCcw } from 'lucide-react';

interface ReportScreenProps {
  engine: GameEngine;
  runs: RunHistoryRecord[];
  onPlayAgain: () => void;
}

export const ReportScreen: React.FC<ReportScreenProps> = ({ engine, runs, onPlayAgain }) => {
  const G = engine;
  const b = G.getBand(13);
  const secret = G.peak === 0;

  // Ending narrative text
  let ending = 'You made it to Court Square. Your parents are already arguing about where to eat.';
  if (secret) {
    ending =
      'At Court Square, Mom takes your hand on the escalator. \u201cYou can stop pretending now,\u201d she says, not looking at you. \u201cWe saw it too.\u201d';
  } else if (G.interventions > 0) {
    ending =
      'You made it to Court Square. Dad keeps a hand on your shoulder all the way up the stairs, and nobody says anything.';
  } else if (G.trials.length > 0) {
    ending =
      'You made it to Court Square. Mom doesn\u2019t let go of your sleeve until you\u2019re outside.';
  }

  const sanityPct = G.getSanityScore();
  const totalAn = G.acc.correct + G.acc.miss;
  const susTop = G.susLog.filter((l) => l.n > 0 || l.reason.startsWith('Concerned')).slice(0, 10);

  // Averages across device runs
  const avgPeak = runs.length ? Math.round(runs.reduce((a, r) => a + r.peak, 0) / runs.length) : 0;
  const runsWithSan = runs.filter((r) => typeof r.sanPct === 'number');
  const avgSan = runsWithSan.length ? Math.round(runsWithSan.reduce((a, r) => a + r.sanPct, 0) / runsWithSan.length) : null;

  const tellText = (r: StopLogRecord) => {
    let t =
      r.tick === 'doors'
        ? r.paLie
          ? 'The tell: the doors opened early, and the announcement lied.'
          : 'The tell: the doors opened early, with no announcement.'
        : r.tick === 'flicker'
        ? 'The tell: the lights flickered as you pulled in.'
        : '';
    if (r.mislead) t += ' Mom said it was your transfer. She was wrong. The doors weren\u2019t.';
    if (r.bait) t += ' Mom said "This is us." She was wrong. The lights weren\u2019t.';
    return t;
  };

  return (
    <div className="fixed inset-0 z-30 flex justify-center overflow-y-auto p-3 sm:p-6 bg-black/85 backdrop-blur-md">
      <div className="w-full max-w-xl my-auto py-4">
        {/* Paper Receipt / Travel Report Slip */}
        <article className="ticket-slip bg-[#e8e2cf] text-[#1b1d18] p-5 sm:p-7 rounded-sm shadow-2xl border border-[#9f9883]">
          <div className="border-b-2 border-[#1b1d18] pb-3 mb-4">
            <h2 className="text-3xl sm:text-4xl font-black uppercase tracking-tight leading-none">
              Travel Report
            </h2>
            <p className="text-xs sm:text-sm text-[#55574c] mt-1 font-semibold">
              G train, Hoyt–Schermerhorn to Court Sq. Ride #{runs.length}.
            </p>
          </div>

          {/* Narrative Outcome */}
          <div className="mb-5 p-3.5 rounded bg-black/5 border-l-4 border-[#6cbe45] text-sm sm:text-base font-semibold leading-relaxed">
            {ending}
          </div>

          {/* Core Evaluation Pillars */}
          <dl className="border-t border-[#1b1d18] divide-y divide-[#9f9883]/60 text-xs sm:text-sm">
            {/* Sanity Retained */}
            <div className="py-2.5 grid grid-cols-1 sm:grid-cols-[10rem_1fr] gap-1 sm:gap-3">
              <dt className="font-extrabold uppercase text-[#1b1d18] tracking-wide">Sanity Retained</dt>
              <dd>
                <span className="text-base sm:text-lg font-black text-[#264a22]">{sanityPct}%</span>
                <p className="text-[#55574c] text-xs mt-0.5 leading-snug">
                  Average position inside each stop's band (floor 0% to ceiling 100%).
                  <br />
                  Final sanity: <strong>{Math.round(G.san)}</strong> (Band {b[0]}–{b[1]}
                  {G.restraintOK ? ` +${RESTRAINT_RAISE} restraint bonus` : ''}).
                </p>
              </dd>
            </div>

            {/* Mask Integrity */}
            <div className="py-2.5 grid grid-cols-1 sm:grid-cols-[10rem_1fr] gap-1 sm:gap-3">
              <dt className="font-extrabold uppercase text-[#1b1d18] tracking-wide">Mask Integrity</dt>
              <dd>
                <span className="text-base sm:text-lg font-black">Peak Suspicion: {G.peak}</span>
                {secret && (
                  <p className="text-[#264a22] font-bold text-xs mt-0.5">
                    ★ Zero Suspicion run achieved! They never suspected a thing.
                  </p>
                )}
                {G.interventions > 0 && (
                  <p className="text-[#9b3526] text-xs font-semibold mt-0.5">
                    Parents intervened {G.interventions} time{G.interventions > 1 ? 's' : ''}.
                  </p>
                )}
                {susTop.length > 0 && (
                  <ul className="mt-2 space-y-1 text-xs text-[#55574c]">
                    {susTop.map((l, i) => (
                      <li key={i} className="flex items-start gap-1">
                        <span className="font-mono text-[#1b1d18] font-bold">Stop {l.stop}:</span>
                        <span>{l.reason}</span>
                        {l.n > 0 && <span className="font-bold text-[#9b3526]">(+{l.n})</span>}
                      </li>
                    ))}
                  </ul>
                )}
              </dd>
            </div>

            {/* Anomaly Accuracy */}
            <div className="py-2.5 grid grid-cols-1 sm:grid-cols-[10rem_1fr] gap-1 sm:gap-3">
              <dt className="font-extrabold uppercase text-[#1b1d18] tracking-wide">Anomaly Accuracy</dt>
              <dd>
                <span className="text-base sm:text-lg font-black">
                  {G.acc.correct} of {totalAn} Caught
                </span>
                <p className="text-[#55574c] text-xs mt-0.5">
                  {G.acc.miss} missed, {G.acc.fp} false flag{G.acc.fp === 1 ? '' : 's'}.
                </p>
              </dd>
            </div>

            {/* Restraint Moment */}
            <div className="py-2.5 grid grid-cols-1 sm:grid-cols-[10rem_1fr] gap-1 sm:gap-3">
              <dt className="font-extrabold uppercase text-[#1b1d18] tracking-wide">Restraint (Stop 11)</dt>
              <dd className="font-bold">
                <span className={G.restraintOK ? 'text-[#264a22]' : 'text-[#9b3526]'}>
                  {G.restraintOK ? 'Held (Composure Maintained)' : G.restraintWhy || 'Failed'}
                </span>
              </dd>
            </div>

            {/* False Stop Trials */}
            <div className="py-2.5 grid grid-cols-1 sm:grid-cols-[10rem_1fr] gap-1 sm:gap-3">
              <dt className="font-extrabold uppercase text-[#1b1d18] tracking-wide">False Stop Trials</dt>
              <dd className="font-semibold text-xs sm:text-sm">
                {G.trials.length > 0
                  ? G.trials.map((t) => `Stop ${t.stop} (${t.depth} loops deep)`).join('; ')
                  : 'None. You never stepped off into a trap.'}
              </dd>
            </div>
          </dl>

          {/* Stop By Stop Log Table */}
          <h3 className="mt-5 mb-2 font-black text-xs sm:text-sm uppercase tracking-wide border-t-2 border-[#1b1d18] pt-3">
            Stop by Stop Record
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#9f9883] text-[#1b1d18]">
                  <th className="py-1.5 pr-2 font-bold">Stop</th>
                  <th className="py-1.5 pr-2 font-bold">Type</th>
                  <th className="py-1.5 pr-2 font-bold">Doors</th>
                  <th className="py-1.5 pr-2 font-bold">Anomalies</th>
                  <th className="py-1.5 text-right font-bold">Sanity</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#c4bda7]">
                {G.stopLog.map((r, i) => {
                  const typeLabel =
                    r.type === 'haven' ? 'Safe Haven' : r.type === 'false' ? 'False Stop' : 'Real Stop';
                  const tell = tellText(r);

                  return (
                    <tr key={i} className="align-top text-[11px] sm:text-xs">
                      <td className="py-1.5 pr-2 font-bold whitespace-nowrap">
                        {r.stop}
                        {r.b ? 'b' : ''}. {r.name}
                      </td>
                      <td className="py-1.5 pr-2">
                        <span className="font-semibold">{typeLabel}</span>
                        {tell && (
                          <div className="text-[10px] text-[#55574c] leading-tight mt-0.5">{tell}</div>
                        )}
                      </td>
                      <td className="py-1.5 pr-2 font-bold whitespace-nowrap">
                        {r.doors ? (
                          <span className={r.correct ? 'text-[#264a22]' : 'text-[#9b3526]'}>
                            {r.doors === 'stay' ? 'Stayed' : 'Stepped off'}
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="py-1.5 pr-2">
                        {r.anoms.length > 0 || r.fps.length > 0 ? (
                          <div className="space-y-0.5">
                            {r.anoms.map((a, ai) => (
                              <div key={ai} className="leading-tight">
                                <span className={a.hit ? 'text-[#264a22] font-bold' : 'text-[#9b3526] font-bold'}>
                                  {a.hit ? 'Caught' : 'Missed'}:
                                </span>{' '}
                                {a.desc}
                              </div>
                            ))}
                            {r.fps.map((fp, fi) => (
                              <div key={`fp-${fi}`} className="text-[#9b3526] font-semibold leading-tight">
                                False flag: {fp}
                              </div>
                            ))}
                          </div>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="py-1.5 text-right font-mono whitespace-nowrap">
                        {r.san !== undefined ? (
                          <>
                            <span className="font-bold">{r.san}</span>
                            <div className="text-[10px] text-[#55574c]">
                              {r.lo}–{r.hi}
                            </div>
                          </>
                        ) : (
                          '—'
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Historical Stats */}
          <div className="mt-4 pt-3 border-t border-[#9f9883] text-[11px] sm:text-xs text-[#55574c]">
            Across {runs.length} ride{runs.length === 1 ? '' : 's'} on this device, your average peak suspicion is{' '}
            <strong>{avgPeak}</strong>
            {avgSan !== null && (
              <>
                {' '}and your average sanity retained is <strong>{avgSan}%</strong>
              </>
            )}.
          </div>
        </article>

        {/* Action Button */}
        <div className="mt-5 flex justify-center">
          <button
            onClick={onPlayAgain}
            className="px-6 py-3.5 rounded bg-[#6cbe45] hover:bg-[#7ad150] text-[#0f1a0b] font-extrabold text-base tracking-wide transition-all shadow-xl active:scale-95 flex items-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            Ride Again
          </button>
        </div>
      </div>
    </div>
  );
};
