/**
 * Custom Post-Processing Glitch Pass for Psychological Sanity Deterioration
 * Simulates RGB chromatic aberration, scanline tearing, and CRT phosphor decay.
 */
import * as THREE from 'three';

export class GlitchPass {
  private renderer: THREE.WebGLRenderer;
  private renderTarget: THREE.WebGLRenderTarget | null = null;
  private scenePost: THREE.Scene;
  private cameraPost: THREE.OrthographicCamera;
  private quad: THREE.Mesh;
  private material: THREE.ShaderMaterial;

  constructor(renderer: THREE.WebGLRenderer) {
    this.renderer = renderer;
    this.scenePost = new THREE.Scene();
    this.cameraPost = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    const vertexShader = `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = vec4(position, 1.0);
      }
    `;

    const fragmentShader = `
      uniform sampler2D tDiffuse;
      uniform float uAmount;
      uniform float uTime;
      uniform float uSeed;
      varying vec2 vUv;

      float rand(vec2 co) {
        return fract(sin(dot(co.xy, vec2(12.9898, 78.233))) * 43758.5453);
      }

      void main() {
        vec2 uv = vUv;
        if (uAmount <= 0.001) {
          gl_FragColor = texture2D(tDiffuse, uv);
          return;
        }

        // Horizontal scanline tearing
        float sliceY = floor(uv.y * 32.0 + uSeed * 10.0);
        float sliceRand = rand(vec2(sliceY, floor(uTime * 15.0)));
        if (sliceRand > 0.8) {
          uv.x += (sliceRand - 0.5) * 0.08 * uAmount;
        }

        // Chromatic aberration
        float split = 0.025 * uAmount * (1.0 + rand(vec2(uTime, uSeed)));
        float r = texture2D(tDiffuse, uv + vec2(split, 0.0)).r;
        float g = texture2D(tDiffuse, uv).g;
        float b = texture2D(tDiffuse, uv - vec2(split, 0.0)).b;

        // Subtle CRT scanline darkening
        float scanline = sin(uv.y * 800.0) * 0.04 * uAmount;

        gl_FragColor = vec4(vec3(r, g, b) - scanline, 1.0);
      }
    `;

    this.material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        tDiffuse: { value: null },
        uAmount: { value: 0 },
        uTime: { value: 0 },
        uSeed: { value: 0 },
      },
      depthTest: false,
      depthWrite: false,
    });

    this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.material);
    this.scenePost.add(this.quad);
    this.syncSize();
  }

  public syncSize() {
    const size = new THREE.Vector2();
    this.renderer.getSize(size);
    const pixelRatio = this.renderer.getPixelRatio();
    const w = Math.floor(size.x * pixelRatio) || 1;
    const h = Math.floor(size.y * pixelRatio) || 1;

    if (!this.renderTarget || this.renderTarget.width !== w || this.renderTarget.height !== h) {
      this.renderTarget?.dispose();
      this.renderTarget = new THREE.WebGLRenderTarget(w, h, {
        minFilter: THREE.LinearFilter,
        magFilter: THREE.LinearFilter,
        format: THREE.RGBAFormat,
      });
    }
  }

  public render(
    scene: THREE.Scene,
    camera: THREE.Camera,
    glitchAmt: number,
    elapsed: number = 0,
    seed: number = 0
  ) {
    if (glitchAmt <= 0.001 || !this.renderTarget) {
      this.renderer.render(scene, camera);
      return;
    }

    // Render 3D scene into render target
    this.renderer.setRenderTarget(this.renderTarget);
    this.renderer.render(scene, camera);

    // Render post-process quad to screen
    this.renderer.setRenderTarget(null);
    this.material.uniforms.tDiffuse.value = this.renderTarget.texture;
    this.material.uniforms.uAmount.value = glitchAmt;
    this.material.uniforms.uTime.value = elapsed;
    this.material.uniforms.uSeed.value = seed;
    this.renderer.render(this.scenePost, this.cameraPost);
  }

  public dispose() {
    this.renderTarget?.dispose();
    this.material.dispose();
    this.quad.geometry.dispose();
  }
}
