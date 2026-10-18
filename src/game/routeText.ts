/**
 * Place names in the story, per route. Endings, announcements, Trial signs and broadcasts say
 * where *this* ride is going (the player can switch lines mid-ride), not always the G.
 *
 * Text uses tokens, filled by `fillRoute`:
 *   {line}        route letter: G, L, 7
 *   {origin}      first stop, as signed:        Hoyt–Schermerhorn
 *   {originShort} first stop, as people say it: Hoyt
 *   {terminus}    last stop, as people say it:  Court Square
 *   {terminusSign} last stop, as signed:        Court Sq
 *   {bait}        the Stop 12 False Stop:       21 St
 *   {s1}…{s13}    any stop, as people say it (the signed name unless a shorter one is set)
 *   {opposite}    the other direction's terminal, for platform signs
 *   {street}      the street outside the last stop
 *   {area}        the neighborhood around it
 */
import { routeManager } from './routeManager';
import type { TransitLineRoute } from '../types';

interface RouteWords {
  originShort: string;
  terminus: string;
  /** Spoken names where they differ from the sign, by stop number. */
  short?: Record<number, string>;
  opposite: string;
  street: string;
  area: string;
}

const WORDS: Record<TransitLineRoute['id'], RouteWords> = {
  G: {
    originShort: 'Hoyt',
    terminus: 'Court Square',
    short: { 5: 'Bedford–Nostrand', 10: 'Nassau', 11: 'Greenpoint' },
    opposite: 'Church Av',
    street: '45th Road',
    area: 'Long Island City',
  },
  L: {
    originShort: '8th Av',
    terminus: 'Myrtle–Wyckoff',
    opposite: '8 Av',
    street: 'Wyckoff Avenue',
    area: 'Ridgewood',
  },
  7: {
    originShort: 'Times Square',
    terminus: 'Terminal Echo',
    opposite: 'Times Sq',
    street: 'a street none of you can name',
    area: 'a neighborhood none of you recognize',
  },
};

export type RouteText = Record<'line' | 'origin' | 'originShort' | 'terminus' | 'terminusSign' | 'bait' | 'opposite' | 'street' | 'area', string> &
  Record<`s${number}`, string>;

export function routeText(route: TransitLineRoute = routeManager.activeRoute): RouteText {
  const w = WORDS[route.id];
  const rt: Record<string, string> = {
    line: route.id,
    origin: route.stops[1],
    originShort: w.originShort,
    terminus: w.terminus,
    terminusSign: route.stops[13],
    bait: route.stops[12],
    opposite: w.opposite,
    street: w.street,
    area: w.area,
  };
  for (let i = 1; i < route.stops.length; i++) rt[`s${i}`] = w.short?.[i] ?? route.stops[i];
  return rt as RouteText;
}

/** Fill `{token}`s with the route's place names (unknown tokens are left as they are). */
export function fillRoute(text: string, rt: RouteText = routeText()): string {
  return text.replace(/\{(\w+)\}/g, (m, k: string) => (k in rt ? (rt as Record<string, string>)[k] : m));
}
