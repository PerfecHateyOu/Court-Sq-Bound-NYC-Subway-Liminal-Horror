/**
 * Dev-only: export the procedural geometry to .glb files for Blender.
 *
 * Never imported by the game. It is loaded only by dev/export.html (served by the Vite dev
 * server, not part of `vite build`) and by `bun run export:glb` (scripts/export-glb.mjs).
 *
 * Each builder runs in its own throwaway scene, exactly as the game builds it, then the parts
 * are detached, made visible, named and exported with three's GLTFExporter (binary, textures
 * embedded as PNG).
 */
import * as THREE from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { SubwayCarBuilder } from '../graphics/subwayCarBuilder';
import { TrialBuilder } from '../graphics/trialBuilder';
import type { PersonObject } from '../types';

export interface ExportedFile {
  name: string;
  bytes: ArrayBuffer;
  /** Things that could not be exported faithfully (shader materials etc.). */
  notes: string[];
}

const slug = (s: string) =>
  s
    .replace(/[^A-Za-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 48) || 'unnamed';

const hex = (c?: THREE.Color) => (c ? c.getHexString() : 'none');

/**
 * Blender-friendly names: every unnamed node gets `<parent>_<kind>_<n>`, every material
 * `<type>_<colour>[_<texture>]`. Shader materials (the trestle sky) can't be expressed in glTF,
 * so they become a flat unlit material of a representative colour and are listed in `notes`.
 */
function prepare(root: THREE.Object3D, notes: string[]) {
  const counts = new Map<string, number>();
  const matNames = new Map<THREE.Material, string>();
  const usedMat = new Map<string, number>();
  const nameMat = (m: THREE.Material): string => {
    const known = matNames.get(m);
    if (known) return known;
    const anyM = m as THREE.Material & { color?: THREE.Color; map?: THREE.Texture | null };
    let base = m.name ? slug(m.name) : `${m.type.replace(/^Mesh|Material$/g, '')}_${hex(anyM.color)}${anyM.map ? '_tex' : ''}`;
    const n = usedMat.get(base) ?? 0;
    usedMat.set(base, n + 1);
    if (n) base += `_${n}`;
    m.name = base;
    if (anyM.map && !anyM.map.name) anyM.map.name = `${base}_map`;
    matNames.set(m, base);
    return base;
  };

  root.traverse((o) => {
    o.visible = true;
    const mesh = o as THREE.Mesh;
    if (mesh.isMesh) {
      const fix = (m: THREE.Material): THREE.Material => {
        if ((m as THREE.ShaderMaterial).isShaderMaterial) {
          notes.push(`${o.parent?.name || root.name}: ShaderMaterial replaced with flat unlit colour (glTF has no custom shaders)`);
          const flat = new THREE.MeshBasicMaterial({ color: 0x1b1a33, side: m.side });
          flat.name = 'ShaderSky_placeholder';
          return flat;
        }
        return m;
      };
      mesh.material = Array.isArray(mesh.material) ? mesh.material.map(fix) : fix(mesh.material);
      (Array.isArray(mesh.material) ? mesh.material : [mesh.material]).forEach(nameMat);
    }
    if (!o.name && o !== root) {
      const kind = mesh.isMesh
        ? (mesh.geometry?.type || 'Mesh').replace(/Geometry$/, '')
        : (o as THREE.Light).isLight
          ? o.type
          : 'Group';
      const key = `${o.parent?.name || root.name}_${kind}`;
      const n = (counts.get(key) ?? 0) + 1;
      counts.set(key, n);
      o.name = `${key}_${String(n).padStart(2, '0')}`;
    }
  });
}

function detach(o: THREE.Object3D, name: string, atOrigin = true): THREE.Group {
  const g = new THREE.Group();
  g.name = name;
  o.removeFromParent();
  if (!o.name) o.name = `${name}_root`;
  if (atOrigin) {
    o.position.set(0, 0, 0);
    o.rotation.set(0, 0, 0);
  }
  g.add(o);
  return g;
}

async function toGlb(root: THREE.Object3D): Promise<ArrayBuffer> {
  root.updateMatrixWorld(true);
  const out = await new GLTFExporter().parseAsync(root, {
    binary: true,
    onlyVisible: true,
    embedImages: true,
    maxTextureSize: 2048,
  });
  return out as ArrayBuffer;
}

/** Build every part, export it, and return the files (names include `.glb`). */
export async function exportAll(): Promise<ExportedFile[]> {
  const files: ExportedFile[] = [];
  const emit = async (name: string, root: THREE.Object3D) => {
    const notes: string[] = [];
    root.name = name;
    prepare(root, notes);
    files.push({ name: `${name}.glb`, bytes: await toGlb(root), notes: [...new Set(notes)] });
  };

  const scene = new THREE.Scene();
  const cb = new SubwayCarBuilder(scene);
  cb.buildScene();

  // People first, so the car exports without its passengers (they're separate files).
  const people: Array<[string, PersonObject]> = [];
  const add = (group: string, list: PersonObject[]) => list.forEach((p, i) => people.push([`${group}_${String(i + 1).padStart(2, '0')}_${slug(p.label || p.tid)}`, p]));
  add('parent', cb.parents);
  add('stranger', cb.strangers);
  if (cb.extraPerson) add('extra', [cb.extraPerson]);
  add('crowd', cb.crowd);
  add('carA_passenger', cb.carAPassengers);
  add('carC_passenger', cb.carCPassengers);
  const seen = new Set<THREE.Object3D>();
  const personGroups: Array<[string, THREE.Group]> = [];
  for (const [n, p] of people) {
    if (seen.has(p.g)) continue;
    seen.add(p.g);
    personGroups.push([n, detach(p.g, `character_${n}`)]);
  }

  // Car and its surroundings (the three cars, gangways, tunnel), in game coordinates.
  const car = new THREE.Group();
  for (const [n, g] of [
    ['carA_lead', cb.carAGroup],
    ['carB_mid', cb.carGroup],
    ['carC_rear', cb.carCGroup],
    ['gangways', cb.gangwayGroup],
    ['tunnel', cb.tunnelGroup],
  ] as const) {
    g.removeFromParent();
    g.name = n;
    car.add(g);
  }
  // Ceiling point lights are hidden in-game (a pooled set stands in); keep them as markers.
  await emit('subway_car', car);

  cb.stA.setName('Court Sq');
  await emit('station_platform', detach(cb.stA.g, 'platform', true));
  cb.stB.setName('21 St');
  cb.stB.setOpenAir(true);
  await emit('station_platform_open_air', detach(cb.stB.g, 'platform', true));

  for (const [n, g] of personGroups) await emit(`character_${n}`, g);

  await emit('trestle_scenery', detach(cb.trestle.group, 'scenery', false));
  await emit('trestle_steel', detach(cb.trestle.steelGroup, 'steel', false));
  await emit('passing_train', detach(cb.passingTrain.group, 'train', true));

  const trial = new TrialBuilder(new THREE.Scene());
  await emit('trial_room', detach(trial.group, 'room', false));

  return files;
}

/** For the Playwright script: base64 so it survives page.evaluate. */
export async function exportAllBase64() {
  const files = await exportAll();
  return files.map((f) => {
    let s = '';
    const u = new Uint8Array(f.bytes);
    for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode(...u.subarray(i, i + 0x8000));
    return { name: f.name, notes: f.notes, b64: btoa(s) };
  });
}

/** Reload a .glb with GLTFLoader and count what came back (a round-trip sanity check). */
export async function verifyBase64(b64: string) {
  const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js');
  const bin = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  const gltf = await new GLTFLoader().parseAsync(bin.buffer, '');
  let meshes = 0;
  let tris = 0;
  const mats = new Set<string>();
  const unnamed: string[] = [];
  gltf.scene.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!o.name) unnamed.push(o.type);
    if (m.isMesh) {
      meshes++;
      const g = m.geometry;
      tris += (g.index ? g.index.count : g.attributes.position.count) / 3;
      (Array.isArray(m.material) ? m.material : [m.material]).forEach((x) => mats.add(x.name));
    }
  });
  return { meshes, triangles: Math.round(tris), materials: mats.size, textures: gltf.parser.json.textures?.length ?? 0, unnamedNodes: unnamed.length };
}
