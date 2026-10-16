/**
 * Escape Endings Hierarchy & Archive for Court Sq-Bound (Operation Skyward Phase 3)
 *
 * Implements strict priority hierarchy:
 * 1. The Secret Composure Ending (Priority 1): Zero Suspicion (peak === 0)
 * 2. The Signal Archivist / Midnight Terminal (Priority 2): 4+ EVP tapes + Abandoned Lower Level exit
 * 3. Skyward Catwalk / The Rooftop Void (Priority 3): Catwalk at Stop 12 or Emergency Surface Hatch at Stop 13 (no interventions)
 * 4. Interventions / Exposed Ending (Priority 4): Parents intervened
 * 5. False Stop Collapse (Priority 5): Failed False Stop Trials
 * 6. Standard Civilian Extraction (Priority 6): Default civilian arrival
 */
import { GameEngine } from './gameState';
import { evp } from './evpManager';

export type EndingId =
  | 'secret_mask'
  | 'signal_archivist'
  | 'skyward_void'
  | 'exposed'
  | 'collapse'
  | 'civilian_extraction';

export interface EndingDefinition {
  id: EndingId;
  priority: number;
  title: string;
  badge: string;
  narrative: string;
  summary: string;
  hint: string;
}

export const ENDINGS: Record<EndingId, EndingDefinition> = {
  secret_mask: {
    id: 'secret_mask',
    priority: 1,
    title: 'The Unbroken Mask',
    badge: '[SECRET: THE UNBROKEN MASK]',
    narrative:
      'At Court Square, Mom takes your hand on the escalator. \u201cYou can stop pretending now,\u201d she says, not looking at you. \u201cWe saw it too.\u201d',
    summary: 'Complete the entire journey maintaining zero Suspicion (peak: 0). The supreme test of composure.',
    hint: 'Never stare, snap your head, raise equipment while watched, or slip on mask checks.',
  },
  signal_archivist: {
    id: 'signal_archivist',
    priority: 2,
    title: 'Midnight Terminal',
    badge: '[BRANCH: SIGNAL ARCHIVIST]',
    narrative:
      'You descend past the rusted chain-link gate into Court Square\u2019s abandoned lower level. The microcassette recorder crackles to life on its own in the damp darkness. A calm dispatcher voice speaks through the hiss: \u201cTrack 4 clear. All units hold position.\u201d The loop is broken.',
    summary: 'Recover tape recordings across the journey and follow the static to the abandoned lower level at Court Square.',
    hint: 'Record multiple EVP radio carriers and choose the lower level stairwell at Stop 13.',
  },
  skyward_void: {
    id: 'skyward_void',
    priority: 3,
    title: 'Skyward Catwalk',
    badge: '[BRANCH: SKYWARD VOID]',
    narrative:
      'You break away through the emergency surface hatch onto the elevated steel trestle above Long Island City. Below you, the sodium lights of the city glow in eerie silence, completely empty. Behind you, the G train rumbles into the dark tunnel\u2014its cars completely hollow.',
    summary: 'Ascend to the elevated trestle or slip through the surface emergency hatch with an uncompromised family bond.',
    hint: 'Inspect the trestle at Stop 12 or take the surface hatch at Stop 13 without parent intervention.',
  },
  exposed: {
    id: 'exposed',
    priority: 4,
    title: 'Exposed',
    badge: '[TERMINAL: EXPOSED]',
    narrative:
      'You made it to Court Square. Dad keeps a firm, unyielding grip on your shoulder all the way up the stairs into the street. Nobody says a single word.',
    summary: 'Parents intervened directly after repeated breaches of composure.',
    hint: 'Allow suspicion to breach 60%, provoking a concerned parental intervention.',
  },
  collapse: {
    id: 'collapse',
    priority: 5,
    title: 'Disoriented Collapse',
    badge: '[COLLAPSE: DISORIENTED]',
    narrative:
      'You made it to Court Square. Mom doesn\u2019t let go of your sleeve until you\u2019re outside on 45th Road. You have no memory of the last three stops.',
    summary: 'Stepped off into a deceptive False Stop and fell into the labyrinthine trial.',
    hint: 'Step off the train at a deceptive False Stop when the lights flicker.',
  },
  civilian_extraction: {
    id: 'civilian_extraction',
    priority: 6,
    title: 'Civilian Extraction',
    badge: '[STANDARD: EXTRACTION]',
    narrative:
      'You made it to Court Square. Your parents push through the turnstiles, already arguing about where to eat in Long Island City.',
    summary: 'Standard civilian exit; ordinary life resumes despite the anomalies witnessed.',
    hint: 'Reach Court Square following normal exit escalators without meeting special criteria.',
  },
};

export const ENDING_IDS: EndingId[] = [
  'secret_mask',
  'signal_archivist',
  'skyward_void',
  'exposed',
  'collapse',
  'civilian_extraction',
];

export const ENDINGS_ARCHIVE_KEY = 'courtSq_endingsArchive';

export interface EndingArchiveEntry {
  id: EndingId;
  discoveredAt: number;
  count: number;
}

export type EndingsArchive = Record<string, EndingArchiveEntry>;

export function loadEndingsArchive(): EndingsArchive {
  try {
    const raw = localStorage.getItem(ENDINGS_ARCHIVE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export function recordEndingToArchive(id: EndingId): EndingsArchive {
  const archive = loadEndingsArchive();
  const existing = archive[id];
  archive[id] = {
    id,
    discoveredAt: existing ? existing.discoveredAt : Date.now(),
    count: (existing?.count || 0) + 1,
  };
  try {
    localStorage.setItem(ENDINGS_ARCHIVE_KEY, JSON.stringify(archive));
  } catch {}
  return archive;
}

export function clearEndingsArchive(): void {
  try {
    localStorage.removeItem(ENDINGS_ARCHIVE_KEY);
  } catch {}
}

/**
 * Evaluates the final escape ending in strict priority order.
 */
export function evaluateEnding(engine: GameEngine): EndingDefinition {
  // Priority 1: The Secret Composure Ending (Zero Suspicion)
  if (engine.peak === 0) {
    return ENDINGS.secret_mask;
  }

  // Priority 2: The Signal Archivist / Midnight Terminal
  // Requires recorded tapes + selecting the Abandoned Lower Level at Stop 13
  const tapesCount = evp.tapes.length;
  const hasArchivistRequirements =
    (tapesCount >= 4 || (tapesCount >= 2 && engine.branchStop12 === 'dispatch')) &&
    engine.finalExitChoice === 'lower_level';
  if (hasArchivistRequirements) {
    return ENDINGS.signal_archivist;
  }

  // Priority 3: Skyward Catwalk / The Rooftop Void
  // Triggered by inspecting trestle catwalk at Stop 12 OR taking surface hatch at Stop 13 without intervention
  const isSkyward =
    (engine.branchStop12 === 'catwalk' || engine.finalExitChoice === 'surface_hatch') &&
    engine.interventions === 0;
  if (isSkyward) {
    return ENDINGS.skyward_void;
  }

  // Priority 4: Interventions / Exposed Ending
  if (engine.interventions > 0) {
    return ENDINGS.exposed;
  }

  // Priority 5: False Stop Collapse
  if (engine.trials.length > 0) {
    return ENDINGS.collapse;
  }

  // Priority 6: Standard Civilian Extraction (Default)
  return ENDINGS.civilian_extraction;
}
