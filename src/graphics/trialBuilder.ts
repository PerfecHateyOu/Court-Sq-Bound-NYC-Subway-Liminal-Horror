/**
 * 3D False Stop Trial Environment Builder
 * Renders the liminal station platform, train doors, illuminated directional signage,
 * and flickering emergency light arrays during psychological escape trials.
 */
import * as THREE from 'three';

export interface TrialDoorOpening {
  interior: THREE.Object3D;
  leaves: Array<{ lg: THREE.Object3D; x0: number; s: number }>;
  openAmt: number;
  target: number;
  flickUntil: number;
  lmat: THREE.MeshBasicMaterial;
  pl: THREE.PointLight;
  signTex?: THREE.CanvasTexture;
  signCanvas?: HTMLCanvasElement;
}

export class TrialBuilder {
  public group: THREE.Group;
  public tileMat: THREE.MeshStandardMaterial;
  public open: TrialDoorOpening[] = [];

  constructor(scene: THREE.Scene) {
    this.group = new THREE.Group();
    this.group.name = 'trial-root';
    this.group.visible = false;
    scene.add(this.group);

    // Tiled liminal station walls
    this.tileMat = new THREE.MeshStandardMaterial({
      color: 0xe8ecf0,
      roughness: 0.6,
      metalness: 0.1,
    });

    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x222426,
      roughness: 0.9,
    });

    // Station platform floor
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(36, 18), floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(0, -0.6, 5);
    this.group.add(floor);

    // Back platform wall
    const wall = new THREE.Mesh(new THREE.PlaneGeometry(36, 6), this.tileMat);
    wall.position.set(0, 2.4, 12);
    this.group.add(wall);

    // Ceiling
    const ceil = new THREE.Mesh(new THREE.PlaneGeometry(36, 18), new THREE.MeshLambertMaterial({ color: 0x111111 }));
    ceil.rotation.x = Math.PI / 2;
    ceil.position.set(0, 5.4, 5);
    this.group.add(ceil);

    // Three exits/door openings: Left, Middle, Right
    const xs = [-6.5, 0, 6.5];
    xs.forEach((x, i) => {
      const doorGroup = new THREE.Group();
      doorGroup.position.set(x, 1.4, 11.9);
      this.group.add(doorGroup);

      // Sign above door
      const signCanvas = document.createElement('canvas');
      signCanvas.width = 256;
      signCanvas.height = 64;
      const signTex = new THREE.CanvasTexture(signCanvas);

      const signMesh = new THREE.Mesh(
        new THREE.PlaneGeometry(2.4, 0.6),
        new THREE.MeshBasicMaterial({ map: signTex })
      );
      signMesh.position.set(0, 1.8, 0.05);
      doorGroup.add(signMesh);

      // Fluorescent tube light
      const lmat = new THREE.MeshBasicMaterial({ color: 0xfff2d6 });
      const lightMesh = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.08, 0.08), lmat);
      lightMesh.position.set(0, 1.45, 0.05);
      doorGroup.add(lightMesh);

      const pl = new THREE.PointLight(0xfff2d6, 0.9, 8, 1.5);
      pl.position.set(0, 1.4, 0.4);
      doorGroup.add(pl);

      // Interior dark void behind doors
      const interior = new THREE.Mesh(
        new THREE.BoxGeometry(2.6, 2.8, 1.5),
        new THREE.MeshBasicMaterial({ color: 0x050505 })
      );
      interior.position.set(0, 0, 0.8);
      interior.visible = false;
      doorGroup.add(interior);

      // Sliding door leaves
      const leafMat = new THREE.MeshStandardMaterial({
        color: 0x88929a,
        metalness: 0.6,
        roughness: 0.4,
      });

      const leftLeaf = new THREE.Mesh(new THREE.BoxGeometry(1.2, 2.6, 0.06), leafMat);
      leftLeaf.position.set(-0.6, 0, 0);
      doorGroup.add(leftLeaf);

      const rightLeaf = new THREE.Mesh(new THREE.BoxGeometry(1.2, 2.6, 0.06), leafMat);
      rightLeaf.position.set(0.6, 0, 0);
      doorGroup.add(rightLeaf);

      const entry: TrialDoorOpening = {
        interior,
        leaves: [
          { lg: leftLeaf, x0: -0.6, s: -1 },
          { lg: rightLeaf, x0: 0.6, s: 1 },
        ],
        openAmt: 0,
        target: 0,
        flickUntil: -1,
        lmat,
        pl,
        signTex,
        signCanvas,
      };

      this.setSignText(entry, `Exit ${i + 1}`);
      this.open.push(entry);
    });
  }

  public setSignText(o: TrialDoorOpening, text: string) {
    if (!o.signCanvas || !o.signTex) return;
    const ctx = o.signCanvas.getContext('2d')!;
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, 256, 64);

    ctx.strokeStyle = '#e3a83a';
    ctx.lineWidth = 3;
    ctx.strokeRect(2, 2, 252, 60);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 22px "Helvetica Neue", Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 128, 32);

    o.signTex.needsUpdate = true;
  }
}
