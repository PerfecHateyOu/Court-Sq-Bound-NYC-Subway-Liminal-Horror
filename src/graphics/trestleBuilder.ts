/**
 * 3D Newtown Creek Bridge Trestle & Open-Air Elevated Environment
 * Authentic NYC sodium-vapor night atmosphere: steel trusses, track ties,
 * dark waterway reflections, misty fog particles, and distant skyline silhouettes.
 */
import * as THREE from 'three';

export class TrestleBuilder {
  public group: THREE.Group;
  private trussesGroup: THREE.Group;
  private skylineGroup: THREE.Group;
  private waterMesh: THREE.Mesh;
  private mistParticles: THREE.Points;
  private sodiumLights: THREE.PointLight[] = [];

  constructor(worldGroup: THREE.Group) {
    this.group = new THREE.Group();
    this.group.name = 'trestle-root';
    this.group.visible = false;
    worldGroup.add(this.group);

    this.trussesGroup = new THREE.Group();
    this.group.add(this.trussesGroup);

    this.skylineGroup = new THREE.Group();
    this.group.add(this.skylineGroup);

    // Build steel trestle framework
    const steelMat = new THREE.MeshStandardMaterial({
      color: 0x1f2326,
      roughness: 0.85,
      metalness: 0.4,
    });

    const rustMat = new THREE.MeshStandardMaterial({
      color: 0x3d271e,
      roughness: 0.9,
      metalness: 0.2,
    });

    // Cross-trusses repeating along length
    for (let x = -160; x <= 160; x += 12) {
      // Upright vertical beams
      const leftPost = new THREE.Mesh(new THREE.BoxGeometry(0.35, 7.5, 0.35), steelMat);
      leftPost.position.set(x, 2.5, -3.2);
      this.trussesGroup.add(leftPost);

      const rightPost = new THREE.Mesh(new THREE.BoxGeometry(0.35, 7.5, 0.35), steelMat);
      rightPost.position.set(x, 2.5, 3.2);
      this.trussesGroup.add(rightPost);

      // Top overhead beam
      const topBeam = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.35, 6.7), steelMat);
      topBeam.position.set(x, 6.2, 0);
      this.trussesGroup.add(topBeam);

      // X-diagonal bracing
      const diag1 = new THREE.Mesh(new THREE.BoxGeometry(0.18, 8.2, 0.18), steelMat);
      diag1.position.set(x, 2.5, -3.2);
      diag1.rotation.x = 0.55;
      this.trussesGroup.add(diag1);

      // Track deck ties
      for (let tx = -5; tx < 6; tx += 1.2) {
        const tie = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.3, 4.6), rustMat);
        tie.position.set(x + tx, -0.6, 0);
        this.trussesGroup.add(tie);
      }

      // Sodium streetlamps at intervals
      if (Math.abs(x) % 24 === 0) {
        const light = new THREE.PointLight(0xff8833, 0.9, 18, 1.4);
        light.position.set(x, 5.8, -3.0);
        this.trussesGroup.add(light);
        this.sodiumLights.push(light);

        // Lamp housing fixture
        const fixture = new THREE.Mesh(
          new THREE.SphereGeometry(0.22, 8, 8),
          new THREE.MeshBasicMaterial({ color: 0xffaa44 })
        );
        fixture.position.set(x, 5.9, -3.0);
        this.trussesGroup.add(fixture);
      }
    }

    // Water surface below the bridge
    const waterGeo = new THREE.PlaneGeometry(360, 140, 16, 16);
    const waterMat = new THREE.MeshStandardMaterial({
      color: 0x050a10,
      roughness: 0.1,
      metalness: 0.8,
    });
    this.waterMesh = new THREE.Mesh(waterGeo, waterMat);
    this.waterMesh.rotation.x = -Math.PI / 2;
    this.waterMesh.position.set(0, -9.5, 0);
    this.group.add(this.waterMesh);

    // Distant NYC Queens & Brooklyn skyline silhouettes
    const buildingMat = new THREE.MeshBasicMaterial({ color: 0x070b14 });
    const bXs = [-120, -90, -65, -35, -10, 20, 50, 80, 110, 140];
    bXs.forEach((bx) => {
      const bw = 14 + Math.random() * 16;
      const bh = 22 + Math.random() * 45;
      const bd = 14 + Math.random() * 16;
      const bldg = new THREE.Mesh(new THREE.BoxGeometry(bw, bh, bd), buildingMat);
      bldg.position.set(bx, bh / 2 - 9.5, -45 - Math.random() * 20);
      this.skylineGroup.add(bldg);

      // Blinking red aircraft warning beacon on tall buildings
      if (bh > 40) {
        const beacon = new THREE.Mesh(
          new THREE.SphereGeometry(0.4, 6, 6),
          new THREE.MeshBasicMaterial({ color: 0xff1111 })
        );
        beacon.position.set(bx, bh - 9.0, bldg.position.z);
        this.skylineGroup.add(beacon);
      }
    });

    // Volumetric mist particles for river fog
    const pCount = 180;
    const pGeo = new THREE.BufferGeometry();
    const posArr = new Float32Array(pCount * 3);
    for (let i = 0; i < pCount; i++) {
      posArr[i * 3] = (Math.random() - 0.5) * 240;
      posArr[i * 3 + 1] = -5.0 + Math.random() * 8.0;
      posArr[i * 3 + 2] = (Math.random() - 0.5) * 60;
    }
    pGeo.setAttribute('position', new THREE.BufferAttribute(posArr, 3));
    const pMat = new THREE.PointsMaterial({
      color: 0xd4a574,
      size: 4.5,
      transparent: true,
      opacity: 0.22,
      depthWrite: false,
    });
    this.mistParticles = new THREE.Points(pGeo, pMat);
    this.group.add(this.mistParticles);
  }

  public reset() {
    this.group.visible = false;
  }

  public update(
    gt: number,
    dt: number,
    pos: number,
    _speed: number,
    show: boolean,
    _isOutside: (x: number) => boolean,
    _reduced: boolean,
    outsideK: number
  ) {
    this.group.visible = show || outsideK > 0.05;
    if (!this.group.visible) return;

    // Follow train x movement with smooth tiling
    const chunk = 24;
    const baseOffset = Math.floor(pos / chunk) * chunk;
    this.trussesGroup.position.x = baseOffset;

    // Drift river mist particles with wind
    const posAttr = this.mistParticles.geometry.attributes.position as THREE.BufferAttribute;
    const arr = posAttr.array as Float32Array;
    for (let i = 0; i < arr.length; i += 3) {
      arr[i] += dt * 3.5; // Wind blowing along the river
      if (arr[i] > pos + 120) arr[i] -= 240;
    }
    posAttr.needsUpdate = true;

    // Lamp flicker in high wind
    this.sodiumLights.forEach((l, idx) => {
      const flicker = 0.85 + 0.15 * Math.sin(gt * 12 + idx * 2.3);
      l.intensity = flicker * Math.min(1, outsideK * 1.5);
    });
  }
}
