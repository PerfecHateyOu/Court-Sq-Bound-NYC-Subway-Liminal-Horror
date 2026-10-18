/**
 * Anomaly Spawner & Life Cycle Management
 */
import * as THREE from 'three';
import { ActiveAnomaly } from '../types';
import { PSYCH_ENTRIES } from './psychLog';
import { SubwayCarBuilder } from '../graphics/subwayCarBuilder';

export class AnomalyManager {
  private cb: SubwayCarBuilder;

  constructor(carBuilder: SubwayCarBuilder) {
    this.cb = carBuilder;
  }

  public pickPoolTier(tier: number, stop: number): string {
    const candidates = Object.values(PSYCH_ENTRIES).filter((def) => {
      if (tier <= 1) return def.tier === 1;
      if (tier === 2) return def.tier <= 2;
      return true;
    });
    if (!candidates.length) return 'adswap';
    const picked = candidates[Math.floor(Math.random() * candidates.length)];
    return picked.id;
  }

  public createAnomaly(id: string, trigger: number): ActiveAnomaly | null {
    const def = PSYCH_ENTRIES[id] || PSYCH_ENTRIES.adswap;
    const anomObj = new THREE.Group();
    anomObj.name = `anomaly-${id}`;

    return {
      id: def.id,
      tier: def.tier,
      tids: [def.id],
      obj: anomObj,
      desc: def.note,
      trigger,
      at: null,
      apply: () => {
        anomObj.visible = true;
      },
      revert: () => {
        anomObj.visible = false;
      },
    };
  }
}
