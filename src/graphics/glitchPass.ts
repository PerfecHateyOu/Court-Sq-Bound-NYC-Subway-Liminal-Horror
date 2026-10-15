/**
 * Glitch pass: brief screen tearing + chromatic aberration.
 *
 * Only active while a glitch is playing. The scene renders to an offscreen target, then a
 * full-screen shader displaces a few horizontal bands (localized tearing) and splits the
 * red/blue channels. The rest of the time the app renders straight to the screen, so the
 * pass costs nothing when idle.
 *
 * Tone mapping and sRGB output are applied in this final pass, so an idle-strength pass
 * looks the same as the direct render.
 *
 * Photosensitivity: the band pattern changes at most 9 times a second, bursts last well
 * under a second, and the effect moves pixels rather than flashing brightness. Callers skip
 * it entirely under prefers-reduced-motion.
 */
import * as THREE from 'three';

const PATTERN_HZ = 9;

const vertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  uniform sampler2D tDiffuse;
  uniform float uAmt;   // 0..1 envelope-shaped strength
  uniform float uTime;  // seconds into the glitch
  uniform float uSeed;
  varying vec2 vUv;

  float hash(float n) { return fract(sin(n) * 43758.5453123); }

  void main() {
    vec2 uv = vUv;
    float step_ = floor(uTime * ${PATTERN_HZ.toFixed(1)});

    // Horizontal bands of varying height; only some of them tear.
    float bands = mix(7.0, 22.0, hash(uSeed + step_ * 1.31));
    float band = floor(uv.y * bands);
    float pickBand = hash(band * 1.73 + step_ * 3.11 + uSeed);
    float torn = step(1.0 - 0.22 * uAmt, pickBand); // at most ~1 in 5 bands
    float shift = (hash(band * 2.9 + step_ * 7.7 + uSeed) - 0.5) * 0.12 * uAmt * torn;
    uv.x = fract(uv.x + shift);

    // Chromatic aberration: a faint split everywhere, stronger inside torn bands.
    float ca = (0.0012 + 0.007 * torn) * uAmt;
    vec4 c;
    c.r = texture2D(tDiffuse, vec2(uv.x + ca, uv.y)).r;
    c.g = texture2D(tDiffuse, uv).g;
    c.b = texture2D(tDiffuse, vec2(uv.x - ca, uv.y)).b;
    c.a = 1.0;
    gl_FragColor = c;

    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

export class GlitchPass {
  private renderer: THREE.WebGLRenderer;
  private target: THREE.WebGLRenderTarget;
  private quadScene = new THREE.Scene();
  private quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  private material: THREE.ShaderMaterial;
  private size = new THREE.Vector2();

  constructor(renderer: THREE.WebGLRenderer) {
    this.renderer = renderer;
    this.target = new THREE.WebGLRenderTarget(1, 1, {
      type: THREE.HalfFloatType, // keep HDR for tone mapping in the final pass
      samples: 4, // match the antialiased direct render
    });
    // Allocate up front so the first tear doesn't stall on a large allocation.
    this.syncSize();
    this.material = new THREE.ShaderMaterial({
      uniforms: {
        tDiffuse: { value: this.target.texture },
        uAmt: { value: 0 },
        uTime: { value: 0 },
        uSeed: { value: 0 },
      },
      vertexShader,
      fragmentShader,
      depthTest: false,
      depthWrite: false,
    });
    // Full-screen triangle.
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 2, 0, 0, 2], 2));
    const tri = new THREE.Mesh(geo, this.material);
    tri.frustumCulled = false;
    this.quadScene.add(tri);
  }

  /** Match the target to the renderer's drawing buffer. Call after the renderer is resized. */
  public syncSize() {
    this.renderer.getDrawingBufferSize(this.size);
    if (this.target.width !== this.size.x || this.target.height !== this.size.y) {
      this.target.setSize(this.size.x, this.size.y); // frees the old GPU buffers
    }
    this.renderer.initRenderTarget(this.target); // allocates now, not on the next tear; no-op once allocated
  }

  /** Render the scene through the glitch. amount 0..1, time = seconds since the glitch began. */
  public render(scene: THREE.Scene, camera: THREE.Camera, amount: number, time: number, seed: number) {
    const r = this.renderer;
    this.syncSize(); // no-op unless the size changed since the last resize
    const u = this.material.uniforms;
    u.uAmt.value = amount;
    u.uTime.value = time;
    u.uSeed.value = seed;

    r.setRenderTarget(this.target);
    r.render(scene, camera);
    r.setRenderTarget(null);
    r.render(this.quadScene, this.quadCam);
  }

  public dispose() {
    this.target.dispose();
    this.material.dispose();
  }
}
