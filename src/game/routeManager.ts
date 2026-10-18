/**
 * Transit Route Management (G, L, 7 Subway Lines)
 */
import { TransitLineRoute } from '../types';

export const ROUTES: Record<'G' | 'L' | '7', TransitLineRoute> = {
  G: {
    id: 'G',
    name: 'Brooklyn–Queens Crosstown Local',
    bulletColor: '#6cbe45',
    bulletTextColor: '#1b1d18',
    accentHex: 0x6cbe45,
    anomalyFrequency: 1.0,
    soundtrackProfile: 'brooklyn_crosstown',
    description: 'The classic G train through Brooklyn and Queens, surfacing over Newtown Creek.',
    stops: [
      '',
      'Hoyt–Schermerhorn',
      'Fulton St',
      'Clinton–Washington Avs',
      'Classon Av',
      'Bedford–Nostrand Avs',
      'Myrtle–Willoughby Avs',
      'Flushing Av',
      'Broadway',
      'Metropolitan Av',
      'Nassau Av',
      'Greenpoint Av',
      '21 St',
      'Court Sq',
    ],
  },
  L: {
    id: 'L',
    name: '14th St–Canarsie Local',
    bulletColor: '#a7a9ac',
    bulletTextColor: '#1b1d18',
    accentHex: 0xa7a9ac,
    anomalyFrequency: 1.25,
    soundtrackProfile: 'canarsie_tunnel',
    description: 'High-frequency East River crossing through industrial Brooklyn warehouses.',
    stops: [
      '',
      '8th Av',
      '6th Av',
      'Union Sq',
      '3rd Av',
      '1st Av',
      'Bedford Av',
      'Lorimer St',
      'Graham Av',
      'Grand St',
      'Montrose Av',
      'Morgan Av',
      'Jefferson St',
      'Myrtle–Wyckoff Avs',
    ],
  },
  '7': {
    id: '7',
    name: 'Flushing Local',
    bulletColor: '#b933ad',
    bulletTextColor: '#ffffff',
    accentHex: 0xb933ad,
    anomalyFrequency: 1.15,
    soundtrackProfile: 'queens_elevated',
    description: 'Steep underground grades turning into elevated viaducts over Sunnyside Yard.',
    stops: [
      '',
      '34 St–Hudson Yards',
      'Times Sq–42 St',
      '5th Av',
      'Grand Central',
      'Vernon Blvd–Jackson Av',
      'Hunters Point Av',
      'Court Sq',
      'Queensboro Plaza',
      '33 St–Rawson St',
      '40 St–Lowery St',
      '46 St–Bliss St',
      '52 St',
      '61 St–Woodside',
    ],
  },
};

class RouteManager {
  public routeId: 'G' | 'L' | '7' = 'G';
  public onRouteChanged?: (route: TransitLineRoute) => void;

  public get activeRoute(): TransitLineRoute {
    return ROUTES[this.routeId];
  }

  public setRoute(id: 'G' | 'L' | '7') {
    if (!ROUTES[id]) return;
    this.routeId = id;
    this.onRouteChanged?.(ROUTES[id]);
  }

  public getStopName(index: number): string {
    const stops = this.activeRoute.stops;
    if (index >= 0 && index < stops.length) {
      return stops[index] || stops[stops.length - 1];
    }
    return stops[stops.length - 1] || 'Court Sq';
  }

  public reset() {
    this.routeId = 'G';
  }
}

export const routeManager = new RouteManager();
