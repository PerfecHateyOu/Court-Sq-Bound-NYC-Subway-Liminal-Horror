/**
 * Pixel-art billboard characters for LAST LOCAL (Doom-style, 8 facings).
 *
 * Each character is a folder of 8 PNGs under src/assets/sprites/<name>/, one per facing:
 * south (facing the viewer), south-east, east, north-east, north, north-west, west, south-west.
 * They're imported as modules so the offline single-file build inlines them too.
 * To add a character: drop its folder in src/assets/sprites/ and register it in SPRITE_CHARACTERS.
 */
import * as THREE from 'three';

/** Facing order: index 0 = front, then clockwise as seen from above (camera moving to the figure's right). */
export const SPRITE_FACINGS = [
  'south',
  'south-east',
  'east',
  'north-east',
  'north',
  'north-west',
  'west',
  'south-west',
] as const;

export interface SpriteCharacterDef {
  /** Folder name under src/assets/sprites/. */
  name: string;
  /** Frame size in pixels (square). */
  size: number;
  /** Top row of the figure in the frame (first opaque row). */
  topRow: number;
  /** Row just below the feet (exclusive bottom of the opaque area). */
  feetRow: number;
}

/** Characters available for billboard passengers. */
export const SPRITE_CHARACTERS: Record<string, SpriteCharacterDef> = {
  passenger1: { name: 'passenger1', size: 48, topRow: 1, feetRow: 47 },
};

export const DEFAULT_STANDING_SPRITE = 'passenger1';

const frameUrls = import.meta.glob('../assets/sprites/*/*.png', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>;

/** URL of one facing frame for a character (the one place sprite paths are built). */
export function spriteFrameUrl(character: string, facing: (typeof SPRITE_FACINGS)[number]): string {
  return frameUrls[`../assets/sprites/${character}/${facing}.png`] ?? '';
}

const frameCache = new Map<string, THREE.Texture[]>();

/** The 8 facing textures for a character, loaded once and shared by every passenger using it. */
export function spriteFrames(character: string): THREE.Texture[] {
  let frames = frameCache.get(character);
  if (frames) return frames;
  const loader = new THREE.TextureLoader();
  frames = SPRITE_FACINGS.map((facing) => {
    const tex = loader.load(spriteFrameUrl(character, facing));
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.NearestFilter;
    tex.generateMipmaps = false;
    return tex;
  });
  frameCache.set(character, frames);
  return frames;
}

/**
 * Which facing frame to show. `facingX/Z` is the figure's forward direction in world space,
 * `toCamX/Z` points from the figure to the camera. 0 = front (south), 2 = the figure's right
 * side toward the camera (east), 4 = back (north), 6 = west.
 */
export function spriteFrameIndex(facingX: number, facingZ: number, toCamX: number, toCamZ: number): number {
  // Figure's right in world space is forward x up = (-fz, 0, fx).
  const right = -facingZ * toCamX + facingX * toCamZ;
  const fwd = facingX * toCamX + facingZ * toCamZ;
  const a = Math.atan2(right, fwd);
  return ((Math.round(a / (Math.PI / 4)) % 8) + 8) % 8;
}
