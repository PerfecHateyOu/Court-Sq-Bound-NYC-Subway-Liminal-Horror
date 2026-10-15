/**
 * Subway Route & Transit Line Manager
 * Provides branching MTA routes:
 * - G Line (Lime Crosstown): Classic industrial Brooklyn-Queens route
 * - L Line (Slate 14th St-Canarsie): Modern digital cars, cold ambiance, electronic/temporal anomalies
 * - 7 Ghost Express (Purple Abandoned Spur): Vintage incandescent flicker, subterranean mist, psychological apparitions
 */
import { TransitLineRoute } from '../types';

export const ROUTES: Record<'G' | 'L' | '7', TransitLineRoute> = {
  G: {
    id: 'G',
    name: 'G Brooklyn–Queens Crosstown',
    bulletColor: '#6cbe45',
    bulletTextColor: '#000000',
    accentHex: 0x6cbe45,
    anomalyFrequency: 1.0,
    soundtrackProfile: 'industrial-screech',
    description: 'The classic non-Manhattan line. Rattling curves, aged stainless steel, and flickering fluorescent tubes.',
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
    name: 'L 14th St–Canarsie Express',
    bulletColor: '#a7a9ac',
    bulletTextColor: '#000000',
    accentHex: 0xa7a9ac,
    anomalyFrequency: 1.25,
    soundtrackProfile: 'digital-drone',
    description: 'Modernized CBTC digital transit cars. Cold LED light strips, high-frequency signage glitching, and temporal loops.',
    stops: [
      '',
      '8th Av',
      '6th Av',
      'Union Sq–14th St',
      '3rd Av',
      '1st Av',
      'Bedford Av (Haven)',
      'Lorimer St',
      'Graham Av',
      'Grand St',
      'Montrose Av',
      'Morgan Av',
      'Jefferson St',
      'Myrtle–Wyckoff Avs',
    ],
  },
  7: {
    id: '7',
    name: '7 Ghost Line (Abandoned Spur)',
    bulletColor: '#b933ad',
    bulletTextColor: '#ffffff',
    accentHex: 0xb933ad,
    anomalyFrequency: 1.6,
    soundtrackProfile: 'abyssal-reverb',
    description: 'An unmapped vintage tunnel beneath the East River. Dim incandescent bulbs, thick subterranean vapor, and uncanny passenger apparitions.',
    stops: [
      '',
      'Times Sq–42nd St',
      '5th Av–Bryant Pk',
      'Grand Central',
      'Sub-River Tube Level -4',
      'Abandoned Steinway Haven',
      'Hunters Point Depths',
      'Vernon–Jackson Void',
      'Sunken Yard Switch 9',
      'Dead Track Gantry',
      'Queensboro Cavern',
      'Rawlings Switch',
      'Court Sq Tower Vault',
      'Terminal Echo',
    ],
  },
};

export class RouteManager {
  private activeRouteId: 'G' | 'L' | '7' = 'G';
  public onRouteChanged?: (route: TransitLineRoute) => void;

  public get activeRoute(): TransitLineRoute {
    return ROUTES[this.activeRouteId];
  }

  public get routeId(): 'G' | 'L' | '7' {
    return this.activeRouteId;
  }

  public setRoute(routeId: 'G' | 'L' | '7') {
    if (this.activeRouteId === routeId) return;
    this.activeRouteId = routeId;
    if (this.onRouteChanged) {
      this.onRouteChanged(ROUTES[routeId]);
    }
  }

  public getStopName(stopIndex: number): string {
    const stops = this.activeRoute.stops;
    if (stopIndex >= 1 && stopIndex < stops.length) {
      return stops[stopIndex];
    }
    return `Track Marker ${stopIndex}`;
  }

  public getAllRoutes(): TransitLineRoute[] {
    return [ROUTES.G, ROUTES.L, ROUTES[7]];
  }
}

export const routeManager = new RouteManager();
