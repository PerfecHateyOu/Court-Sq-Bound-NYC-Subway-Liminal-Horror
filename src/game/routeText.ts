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
 *   {s10} {s11}   Stops 10 and 11, as people say them
 *   {opposite}    the other direction's terminal, for platform signs
 *   {street}      the street outside the last stop
 *   {area}        the neighborhood around it
 */
import { routeManager } from './routeManager';
import type { TransitLineRoute } from '../types';

interface RouteWords {
  originShort: string;
  terminus: string;
  s10?: string;
  s11?: string;
  opposite: string;
  street: string;
  area: string;
}

const WORDS: Record<TransitLineRoute['id'], RouteWords> = {
  G: {
    originShort: 'Hoyt',
    terminus: 'Court Square',
    s10: 'Nassau',
    s11: 'Greenpoint',
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

export type RouteText = Record<
  'line' | 'origin' | 'originShort' | 'terminus' | 'terminusSign' | 'bait' | 's10' | 's11' | 'opposite' | 'street' | 'area',
  string
>;

export function routeText(route: TransitLineRoute = routeManager.activeRoute): RouteText {
  const w = WORDS[route.id];
  return {
    line: route.id,
    origin: route.stops[1],
    originShort: w.originShort,
    terminus: w.terminus,
    terminusSign: route.stops[13],
    bait: route.stops[12],
    s10: w.s10 ?? route.stops[10],
    s11: w.s11 ?? route.stops[11],
    opposite: w.opposite,
    street: w.street,
    area: w.area,
  };
}

/** Fill `{token}`s with the route's place names (unknown tokens are left as they are). */
export function fillRoute(text: string, rt: RouteText = routeText()): string {
  return text.replace(/\{(\w+)\}/g, (m, k: string) => (k in rt ? rt[k as keyof RouteText] : m));
}
