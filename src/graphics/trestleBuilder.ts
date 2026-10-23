/**
 * The Newtown Creek trestle (Operation Skyward, Phase 1).
 *
 * The real G crosses under Newtown Creek in a tunnel between Greenpoint Av and 21 St. In the
 * game, at Critical sanity, the train climbs out onto a steel trestle over the creek instead,
 * with the Long Island City and Manhattan skyline at dusk, then drops back underground before
 * Court Sq. The car interior keeps its flat fluorescent light, so the door tick stays readable.
 *
 * Cost: everything is built once. The skyline is one canvas texture on a cylinder plus a few
 * beacon meshes; rain is two textured strips outside the windows. The whole group is hidden
 * (zero cost) except near and during the open-air stretch.
 */
import * as THREE from 'three';

/** Distance between passing steel bents, and the wrap length for scrolling them. */
const BENT_SPACING = 9;
const BENT_WRAP = 90;
/** Beacons glow slower than 1 Hz (photosensitivity: nothing pulses fast). */
const BEACON_HZ = 0.4;

export class TrestleBuilder {
  /** Fixed scenery: sky, skyline, water, beacons, rain. */
  public group = new THREE.Group();
  /** Steel bents and rails that scroll past with the train. */
  public steel: Array<{ m: THREE.Object3D; base: number }> = [];
  public steelGroup = new THREE.Group();

  private rainMats: THREE.MeshBasicMaterial[] = [];
  private beaconMat: THREE.MeshBasicMaterial;
  private skyline!: THREE.Mesh;

  constructor(parent: THREE.Object3D) {
    this.group.visible = false;
    this.steelGroup.visible = false;
    parent.add(this.group, this.steelGroup);

    this.buildSky();
    this.buildSkyline();
    this.buildWater();
    this.buildRain();
    this.buildSteel();
    this.beaconMat = new THREE.MeshBasicMaterial({ color: 0xff2a1a, transparent: true, opacity: 0.9, fog: false });
    this.placeBeacons();
  }

  private buildSky() {
    // Gradient dome: sodium haze at the horizon, bruised violet above, twilight navy overhead.
    const mat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
      uniforms: {
        uViolet: { value: new THREE.Color('#1c162b') },
        uNavy: { value: new THREE.Color('#0c1022') },
        uHaze: { value: new THREE.Color('#ff9944') },
      },
      vertexShader: /* glsl */ `
        varying vec3 vDir;
        void main() {
          vDir = normalize(position);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }`,
      fragmentShader: /* glsl */ `
        uniform vec3 uViolet; uniform vec3 uNavy; uniform vec3 uHaze;
        varying vec3 vDir;
        void main() {
          float h = vDir.y;
          vec3 c = mix(uViolet, uNavy, smoothstep(0.05, 0.6, h));
          c = mix(c, uHaze * 0.6, exp(-max(h, 0.0) * 12.0) * 0.75);   // haze band at the horizon
          if (h < 0.0) c = mix(uHaze * 0.18, uNavy * 0.6, smoothstep(0.0, -0.2, h));
          gl_FragColor = vec4(c, 1.0);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`,
    });
    // Inside the camera's 90 m far plane.
    const dome = new THREE.Mesh(new THREE.SphereGeometry(85, 32, 16), mat);
    dome.renderOrder = -2;
    dome.frustumCulled = false;
    this.group.add(dome);
  }

  /** Tower silhouettes with lit window grids, drawn once. Returns tower tops for beacons. */
  private towers: Array<{ u: number; top: number }> = [];

  private buildSkyline() {
    const W = 2048;
    const H = 256;
    const c = document.createElement('canvas');
    c.width = W;
    c.height = H;
    const g = c.getContext('2d')!;
    g.clearRect(0, 0, W, H);
    let rng = 7;
    const rand = () => ((rng = (rng * 16807) % 2147483647) / 2147483647);
    for (let pass = 0; pass < 2; pass++) {
      // Far row (paler, shorter), then near row (darker, taller).
      let x = 0;
      while (x < W) {
        const w = 18 + rand() * (pass ? 46 : 30);
        const h = (pass ? 40 : 24) + rand() * (pass ? 150 : 70) * (rand() < 0.12 ? 1.5 : 1);
        const top = H - Math.min(H - 6, h);
        g.fillStyle = pass ? '#07080d' : '#141420';
        g.fillRect(x, top, w, H - top);
        // Window grid: mostly dark, some warm, a few cold.
        for (let wy = top + 5; wy < H - 4; wy += 6) {
          for (let wx = x + 3; wx < x + w - 3; wx += 5) {
            const r = rand();
            if (r < (pass ? 0.16 : 0.08)) {
              g.fillStyle = r < 0.02 ? 'rgba(170,200,255,0.75)' : 'rgba(255,200,120,0.8)';
              g.fillRect(wx, wy, 2, 3);
            }
          }
        }
        if (pass && h > 140) this.towers.push({ u: (x + w / 2) / W, top: top / H });
        x += w + (pass ? rand() * 10 : rand() * 4);
      }
    }
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = THREE.RepeatWrapping;
    tex.repeat.set(2, 1);
    tex.anisotropy = 8; // three clamps this to what the GPU supports
    // Alpha cutout instead of blending: the empty sky above the towers is skipped, not blended.
    const mat = new THREE.MeshBasicMaterial({ map: tex, alphaTest: 0.5, side: THREE.BackSide, fog: false });
    this.skyline = new THREE.Mesh(new THREE.CylinderGeometry(72, 72, 22, 64, 1, true), mat);
    this.skyline.position.y = 1; // base about 10 m below the windows: we're up on the trestle
    this.skyline.renderOrder = -1;
    this.skyline.frustumCulled = false;
    this.group.add(this.skyline);
  }

  private placeBeacons() {
    // One red light on top of each tall tower, in both repeats of the texture.
    const geo = new THREE.SphereGeometry(0.28, 8, 6);
    this.towers.slice(0, 8).forEach((t) => {
      for (const rep of [0, 0.5]) {
        // Cylinder UV u runs around the circumference; BackSide mirrors it, which doesn't matter here.
        const ang = (t.u / 2 + rep) * Math.PI * 2;
        const y = 1 + 11 - t.top * 22 + 0.4;
        const b = new THREE.Mesh(geo, this.beaconMat);
        b.position.set(Math.sin(ang) * 71, y, Math.cos(ang) * 71);
        this.skyline.add(b);
      }
    });
  }

  private buildWater() {
    const c = document.createElement('canvas');
    c.width = 256;
    c.height = 256;
    const g = c.getContext('2d')!;
    g.fillStyle = '#070912';
    g.fillRect(0, 0, 256, 256);
    g.fillStyle = 'rgba(255, 145, 60, 0.14)';
    for (let i = 0; i < 35; i++) {
      g.fillRect(Math.random() * 256, Math.random() * 256, 14 + Math.random() * 32, 2);
    }
    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(8, 8);
    tex.anisotropy = 8;
    const water = new THREE.Mesh(
      new THREE.PlaneGeometry(400, 400),
      new THREE.MeshBasicMaterial({ map: tex, fog: false })
    );
    water.rotation.x = -Math.PI / 2;
    water.position.y = -12;
    this.group.add(water);
  }

  /** Rain on the glass: streak strips just outside each side's windows, along the whole consist. */
  private buildRain() {
    const c = document.createElement('canvas');
    c.width = 256;
    c.height = 256;
    const g = c.getContext('2d')!;
    let rng = 3;
    const rand = () => ((rng = (rng * 16807) % 2147483647) / 2147483647);
    g.clearRect(0, 0, 256, 256);
    g.lineCap = 'round';
    for (let i = 0; i < 70; i++) {
      const x = rand() * 256;
      const y = rand() * 256;
      const len = 10 + rand() * 26;
      g.strokeStyle = `rgba(210,220,235,${0.25 + rand() * 0.35})`;
      g.lineWidth = 0.8 + rand() * 0.9;
      g.beginPath();
      g.moveTo(x, y);
      g.lineTo(x - len * 0.35, y + len); // slanted back by the train's speed
      g.stroke();
    }
    [-1, 1].forEach((s) => {
      const tex = new THREE.CanvasTexture(c);
      tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
      tex.repeat.set(57 / 1.2, 0.85 / 1.2);
      tex.anisotropy = 8;
      const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0.6, depthWrite: false, fog: false });
      const strip = new THREE.Mesh(new THREE.PlaneGeometry(57, 0.85), mat);
      strip.position.set(0, 1.325, s * 1.6);
      if (s > 0) strip.rotation.y = Math.PI;
      this.group.add(strip);
      this.rainMats.push(mat);
    });
  }

  /** Steel bents (the trestle's legs and cross-beams) and guard rails that pass the windows. */
  private buildSteel() {
    const steel = new THREE.MeshLambertMaterial({ color: 0x2a2e33 });
    const rust = new THREE.MeshLambertMaterial({ color: 0x3a2a24 });
    for (let i = 0; i < BENT_WRAP / BENT_SPACING; i++) {
      const bent = new THREE.Group();
      [-1, 1].forEach((s) => {
        const leg = new THREE.Mesh(new THREE.BoxGeometry(0.35, 12, 0.35), steel);
        leg.position.set(0, -6.6, s * 2.6);
        const brace = new THREE.Mesh(new THREE.BoxGeometry(0.12, 7, 0.12), rust);
        brace.position.set(0, -4.5, s * 2.6);
        brace.rotation.x = s * 0.5;
        bent.add(leg, brace);
      });
      const beam = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.5, 5.6), steel);
      beam.position.set(0, -0.75, 0);
      // A railing post at window height on each side, the thing you see flick past.
      [-1, 1].forEach((s) => {
        const post = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.3, 0.08), steel);
        post.position.set(0, 0.2, s * 2.45);
        bent.add(post);
      });
      bent.add(beam);
      this.steelGroup.add(bent);
      this.steel.push({ m: bent, base: i * BENT_SPACING });
    }
    // Continuous guard rails along the open stretch (they don't need to scroll).
    [-1, 1].forEach((s) => {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(400, 0.07, 0.07), steel);
      rail.position.set(0, 0.85, s * 2.45);
      this.group.add(rail);
    });
  }

  /**
   * Per frame. `outside(x)` says whether a point at relative x is in the open (not in tunnel).
   * `show` is whether any open air is in view.
   */
  public update(GT: number, dt: number, pos: number, speed: number, show: boolean, outside: (x: number) => boolean, reduced: boolean, rainLevel: number) {
    this.group.visible = show;
    this.steelGroup.visible = show;
    if (!show) return;
    this.steel.forEach((it) => {
      const x = (((it.base - pos) % BENT_WRAP) + BENT_WRAP) % BENT_WRAP - BENT_WRAP / 2;
      it.m.position.x = x;
      it.m.visible = outside(x);
    });
    // Far skyline: a hint of parallax as the train moves.
    this.skyline.rotation.y = pos * 0.0006;
    this.rainMats.forEach((m) => (m.opacity = 0.6 * rainLevel));
    if (!reduced) {
      // Rain runs down and is pushed back by the train's speed.
      this.rainMats.forEach((m) => {
        m.map!.offset.y += dt * 0.9;
        m.map!.offset.x += dt * speed * 0.02;
      });
      this.beaconMat.opacity = 0.55 + 0.4 * Math.sin(GT * Math.PI * 2 * BEACON_HZ);
    } else {
      this.beaconMat.opacity = 0.9; // steady
    }
  }

  public reset() {
    this.group.visible = false;
    this.steelGroup.visible = false;
  }
}
