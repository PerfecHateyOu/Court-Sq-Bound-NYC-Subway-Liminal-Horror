/**
 * False Stop Trial Loop-Space Builder
 * Construct the liminal subterranean platform fragment with 3 shifting passages,
 * animated train leaves, flickering incandescent lighting, and warped signs.
 */
import * as THREE from 'three';
import { TextureGenerator } from './textureGenerator';

export interface TrialOpening {
  x: number;
  sc: HTMLCanvasElement;
  st: THREE.CanvasTexture;
  lmat: THREE.MeshBasicMaterial;
  pl: THREE.PointLight;
  interior: THREE.Mesh;
  leaves: Array<{ lg: THREE.Group; x0: number; s: number }>;
  flickUntil: number;
  openAmt: number;
  target: number;
}

export class TrialBuilder {
  public group: THREE.Group;
  public tileMat!: THREE.MeshLambertMaterial;
  public open: TrialOpening[] = [];
  public textureGen: TextureGenerator;

  constructor(scene: THREE.Scene, maxAniso: number = 8) {
    this.group = new THREE.Group();
    this.textureGen = new TextureGenerator(maxAniso);
    this.group.visible = false;
    scene.add(this.group);
    this.build();
  }

  private build() {
    const tileTex = this.textureGen.createStationTileTexture(20, 6);
    this.tileMat = new THREE.MeshLambertMaterial({ map: tileTex, emissive: 0x1d1c18 });
    const floorMat = new THREE.MeshLambertMaterial({ color: 0x6a6860 });
    const ceilMat = new THREE.MeshLambertMaterial({ color: 0x3a3c38 });
    const yellowMat = new THREE.MeshLambertMaterial({ color: 0xe3c341 });
    const mDark = new THREE.MeshBasicMaterial({ color: 0x050505 });

    // Floor and ceiling
    const floor = new THREE.Mesh(new THREE.BoxGeometry(12, 0.1, 14), floorMat);
    floor.position.set(0, -0.05, -3);
    const ceil = new THREE.Mesh(new THREE.BoxGeometry(12, 0.1, 14), ceilMat);
    ceil.position.set(0, 3.6, -3);
    this.group.add(floor, ceil);

    // Left and right side walls
    const leftWall = new THREE.Mesh(new THREE.BoxGeometry(0.1, 3.7, 14), this.tileMat);
    leftWall.position.set(-6, 1.8, -3);
    const rightWall = new THREE.Mesh(new THREE.BoxGeometry(0.1, 3.7, 14), this.tileMat);
    rightWall.position.set(6, 1.8, -3);
    const backWall = new THREE.Mesh(new THREE.BoxGeometry(12, 3.7, 0.1), this.tileMat);
    backWall.position.set(0, 1.8, 4);
    this.group.add(leftWall, rightWall, backWall);

    // Front portal divider walls
    [[-6, -3.8], [-2.2, -0.8], [0.8, 2.2], [3.8, 6]].forEach(([a, b]) => {
      const wall = new THREE.Mesh(new THREE.BoxGeometry(b - a, 3.7, 0.2), this.tileMat);
      wall.position.set((a + b) / 2, 1.8, -7);
      this.group.add(wall);
    });

    // Yellow safety strip along portals
    const safetyStrip = new THREE.Mesh(new THREE.BoxGeometry(12, 0.12, 0.6), yellowMat);
    safetyStrip.position.set(0, 0.01, -6.3);
    this.group.add(safetyStrip);

    // 3 Passages (-3, 0, +3)
    [-3, 0, 3].forEach((x) => {
      // Arch header
      const arch = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.3, 0.2), this.tileMat);
      arch.position.set(x, 3.0, -7);
      this.group.add(arch);

      // Dark portal tunnel interior
      const voidBox = new THREE.Mesh(new THREE.BoxGeometry(1.6, 2.4, 0.8), mDark);
      voidBox.position.set(x, 1.2, -7.5);
      this.group.add(voidBox);

      // Wayfinding overhead sign
      const sc = document.createElement('canvas');
      sc.width = 512;
      sc.height = 128;
      const st = new THREE.CanvasTexture(sc);
      st.colorSpace = THREE.SRGBColorSpace;
      st.anisotropy = this.textureGen['aniso'];

      const signMesh = new THREE.Mesh(
        new THREE.PlaneGeometry(2.3, 0.58),
        new THREE.MeshBasicMaterial({ map: st, fog: false })
      );
      signMesh.position.set(x, 2.92, -6.8);
      this.group.add(signMesh);

      // Incandescent light fixture
      const lmat = new THREE.MeshBasicMaterial({ color: 0xfff2d6 });
      const lamp = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.08, 0.08), lmat);
      lamp.position.set(x, 3.32, -6.85);
      this.group.add(lamp);

      const pl = new THREE.PointLight(0xfff0d0, 0.9, 5.5, 2.0);
      pl.position.set(x, 3.0, -6.2);
      this.group.add(pl);

      // Board mode: glowing warm subway interior inside doorway
      const interior = new THREE.Mesh(
        new THREE.BoxGeometry(1.6, 2.4, 0.6),
        new THREE.MeshLambertMaterial({ color: 0xd8a060, emissive: 0x553311 })
      );
      interior.position.set(x, 1.2, -7.6);
      interior.visible = false;
      this.group.add(interior);

      // Sliding train doors for board mode
      const leaves = [-1, 1].map((s) => {
        const lg = new THREE.Group();
        lg.position.set(x + s * 0.4, 1.2, -6.95);
        this.group.add(lg);

        const leaf = new THREE.Mesh(new THREE.BoxGeometry(0.8, 2.4, 0.06), new THREE.MeshLambertMaterial({ color: 0x9aa09c }));
        const leafWin = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.6, 0.07), mDark);
        leafWin.position.set(0, 0.4, 0);
        lg.add(leaf, leafWin);
        lg.visible = false;

        return { lg, x0: x + s * 0.4, s };
      });

      this.open.push({
        x,
        sc,
        st,
        lmat,
        pl,
        interior,
        leaves,
        flickUntil: -1,
        openAmt: 0,
        target: 0,
      });
    });

    // Central ambient ceiling lantern
    const mainLight = new THREE.PointLight(0xfff0d0, 0.75, 16, 1.6);
    mainLight.position.set(0, 3.2, -1);
    this.group.add(mainLight);
  }

  public setSignText(opening: TrialOpening, text: string) {
    const ctx = opening.sc.getContext('2d')!;
    ctx.fillStyle = '#111311';
    ctx.fillRect(0, 0, 512, 128);

    ctx.fillStyle = '#ffffff';
    let fs = 70;
    do {
      ctx.font = `700 ${fs}px "Archivo", "Helvetica Neue", Arial, sans-serif`;
      fs -= 2;
    } while (fs > 28 && ctx.measureText(text).width > 470);

    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';
    ctx.fillText(text, 256, 64, 480);
    ctx.textAlign = 'start';
    opening.st.needsUpdate = true;
  }
}
