/**
 * 3D Stylized Character Mesh Generator for LAST LOCAL
 * Builds stylized passengers with realistic anatomical proportions, layered clothing,
 * articulated heads for gaze tracking, and specific anomaly state controls.
 */
import * as THREE from 'three';
import { PersonArchetype, PersonObject } from '../types';
import { TextureGenerator } from './textureGenerator';

export interface PersonConfig {
  tid: string;
  label: string;
  x: number;
  z: number;
  ry?: number;
  hy?: number;
  hp?: number;
  standing?: boolean;
  skin: number;
  shirt: number;
  pants: number;
  hair: number;
  longHair?: boolean;
  phone?: boolean;
  glasses?: boolean;
  coat?: boolean;
  /** Distinct outfit with its own silhouette and accessories (see PersonArchetype). */
  archetype?: PersonArchetype;
  keep?: () => boolean;
}

export class CharacterBuilder {
  /**
   * Builds an articulated passenger mesh group
   */
  public createPerson(cfg: PersonConfig): PersonObject {
    const g = new THREE.Group();
    const up = cfg.standing ? 0.48 : 0;

    // Materials
    const skMat = new THREE.MeshLambertMaterial({ color: cfg.skin });
    const clothMat = new THREE.MeshLambertMaterial({ color: cfg.shirt });
    const pantsMat = new THREE.MeshLambertMaterial({ color: cfg.pants });
    const hairMat = new THREE.MeshLambertMaterial({ color: cfg.hair });
    const shoeMat = new THREE.MeshLambertMaterial({ color: 0x18181a });
    const eyePupilMat = new THREE.MeshBasicMaterial({ color: 0x111113 });
    const eyeWhiteMat = new THREE.MeshBasicMaterial({ color: 0xeeece8 });

    if (cfg.archetype) {
      this.buildArchetypeBody(g, cfg, skMat, up);
    } else {
      // Torso / Jacket
      const torso = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.52, 0.24), clothMat);
      torso.position.set(0, 0.78 + up, 0);
      g.add(torso);

      // Collar / Scarf accent
      const collar = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.08, 0.22), new THREE.MeshLambertMaterial({ color: cfg.shirt }));
      collar.position.set(0, 1.02 + up, 0);
      g.add(collar);

      // Shoulders
      const shoulders = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.44, 8), clothMat);
      shoulders.rotation.z = Math.PI / 2;
      shoulders.position.set(0, 0.98 + up, 0);
      g.add(shoulders);

      // Legs / Pants
      if (cfg.standing) {
        [-0.09, 0.09].forEach((dx) => {
          const leg = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.84, 0.15), pantsMat);
          leg.position.set(dx, 0.42, 0);
          g.add(leg);

          const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.08, 0.26), shoeMat);
          shoe.position.set(dx, 0.04, 0.05);
          g.add(shoe);
        });
      } else {
        // Seated hips and thighs
        const lap = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.15, 0.44), pantsMat);
        lap.position.set(0, 0.55, 0.2);
        g.add(lap);

        [-0.1, 0.1].forEach((dx) => {
          const shin = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.48, 0.13), pantsMat);
          shin.position.set(dx, 0.25, 0.38);
          g.add(shin);

          const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.08, 0.24), shoeMat);
          shoe.position.set(dx, 0.04, 0.45);
          g.add(shoe);
        });
      }

      // Arms
      [-1, 1].forEach((s) => {
        // Upper arm
        const arm = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.34, 0.1), clothMat);
        arm.position.set(s * 0.24, 0.86 + up, 0.02);
        g.add(arm);

        // Forearm
        const forearm = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.26), clothMat);
        forearm.position.set(s * 0.2, 0.69 + up, 0.14);
        g.add(forearm);

        // Hand
        const hand = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.07, 0.08), skMat);
        hand.position.set(s * 0.16, 0.69 + up, 0.29);
        g.add(hand);
      });

      // Neck
      const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.065, 0.12, 8), skMat);
      neck.position.set(0, 1.07 + up, 0);
      g.add(neck);
    }

    // Articulated Head
    const head = new THREE.Group();
    head.rotation.order = 'YXZ';
    head.position.set(0, 1.22 + up, 0);
    g.add(head);

    // Cranium
    const skull = new THREE.Mesh(new THREE.SphereGeometry(0.112, 16, 14), skMat);
    skull.scale.set(0.92, 1.08, 1.02);
    head.add(skull);

    // Hair
    const hair = new THREE.Mesh(new THREE.SphereGeometry(0.12, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.55), hairMat);
    hair.position.set(0, 0.02, -0.015);
    hair.rotation.x = -0.22;
    head.add(hair);

    if (cfg.longHair) {
      const hairBack = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.32, 0.12), hairMat);
      hairBack.position.set(0, -0.08, -0.08);
      head.add(hairBack);
    }

    // Stylized facial features: Nose
    const nose = new THREE.Mesh(new THREE.ConeGeometry(0.018, 0.045, 4), skMat);
    nose.rotation.x = -Math.PI / 2;
    nose.position.set(0, -0.01, 0.114);
    head.add(nose);

    // Mouth / subtle lip line
    const mouth = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.008, 0.015), new THREE.MeshLambertMaterial({ color: 0x6e3832 }));
    mouth.position.set(0, -0.054, 0.104);
    head.add(mouth);

    // Eyes
    const eyes: THREE.Mesh[] = [];
    [-0.038, 0.038].forEach((ex) => {
      const eyeWhite = new THREE.Mesh(new THREE.SphereGeometry(0.02, 8, 6), eyeWhiteMat);
      eyeWhite.scale.set(1.2, 0.8, 0.6);
      eyeWhite.position.set(ex, 0.016, 0.096);
      head.add(eyeWhite);

      const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.013, 8, 6), eyePupilMat);
      pupil.position.set(ex, 0.016, 0.106);
      head.add(pupil);
      eyes.push(pupil);
    });

    // Glasses for Dad
    if (cfg.glasses) {
      const glassFrameMat = new THREE.MeshBasicMaterial({ color: 0x222225 });
      [-0.038, 0.038].forEach((gx) => {
        const rim = new THREE.Mesh(new THREE.RingGeometry(0.02, 0.026, 12), glassFrameMat);
        rim.position.set(gx, 0.016, 0.112);
        head.add(rim);
      });
      const bridge = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.006, 0.01), glassFrameMat);
      bridge.position.set(0, 0.018, 0.112);
      head.add(bridge);
    }

    if (cfg.archetype) this.addHeadwear(head, cfg.archetype);

    // Smartphone
    let phone: THREE.Object3D | null = null;
    if (cfg.phone) {
      const phoneGroup = new THREE.Group();
      const phoneBody = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.14, 0.01), new THREE.MeshLambertMaterial({ color: 0x1f2124 }));
      const phoneScreen = new THREE.Mesh(new THREE.PlaneGeometry(0.065, 0.125), new THREE.MeshBasicMaterial({ color: 0xb5d4ff }));
      phoneScreen.position.set(0, 0, 0.006);
      phoneGroup.add(phoneBody, phoneScreen);
      phoneGroup.position.set(0, 0.74 + up, 0.33);
      phoneGroup.rotation.x = -0.92;
      g.add(phoneGroup);
      phone = phoneGroup;
    }

    // Position and orientation
    g.position.set(cfg.x, 0, cfg.z);
    g.rotation.y = cfg.ry || 0;

    const person: PersonObject = {
      g,
      head,
      phone,
      eyes,
      skMat,
      skin: cfg.skin,
      tid: cfg.tid,
      label: cfg.label,
      home: new THREE.Vector3(cfg.x, 0, cfg.z),
      pose: [cfg.hy || 0, cfg.hp || 0],
    };

    head.rotation.set(person.pose[1], person.pose[0], 0);
    return person;
  }

  // ---------------------------------------------------------------------------
  // Archetype passengers: same blocky language as the rest of the car, but with a
  // tapered torso, shoulder caps, a box neck, jointed hands, and an outfit that reads
  // by silhouette (long coat + bag, hi-vis vest + hard hat, puffer + headphones).
  // Built facing +Z with feet on the floor, seated by default, raised by `up` when standing.
  // ---------------------------------------------------------------------------

  private static grain: THREE.CanvasTexture | null = null;

  private fabric(color: number): THREE.MeshLambertMaterial {
    if (!CharacterBuilder.grain) CharacterBuilder.grain = new TextureGenerator().createClothGrainTexture();
    return new THREE.MeshLambertMaterial({ color, map: CharacterBuilder.grain });
  }

  private box(parent: THREE.Object3D, w: number, h: number, d: number, mat: THREE.Material, x: number, y: number, z: number): THREE.Mesh {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z);
    parent.add(m);
    return m;
  }

  /** Legs, hips and shoes for either pose. */
  private addLegs(g: THREE.Group, standing: boolean, pantsMat: THREE.Material, shoeMat: THREE.Material, shoeScale = 1, soleMat?: THREE.Material) {
    const sw = 0.13 * shoeScale;
    const sh = 0.08 * shoeScale;
    if (standing) {
      this.box(g, 0.34, 0.16, 0.22, pantsMat, 0, 0.9, 0);
      [-0.09, 0.09].forEach((dx) => {
        this.box(g, 0.15, 0.44, 0.16, pantsMat, dx, 0.62, 0);
        this.box(g, 0.13, 0.42, 0.14, pantsMat, dx, 0.25, 0.005);
        this.box(g, sw, sh, 0.27, shoeMat, dx, sh / 2, 0.05);
        if (soleMat) this.box(g, sw + 0.006, 0.025, 0.275, soleMat, dx, 0.0125, 0.05);
      });
    } else {
      this.box(g, 0.35, 0.15, 0.44, pantsMat, 0, 0.55, 0.2);
      [-0.1, 0.1].forEach((dx) => {
        this.box(g, 0.13, 0.48, 0.13, pantsMat, dx, 0.25, 0.38);
        this.box(g, sw * 0.95, sh, 0.25, shoeMat, dx, sh / 2, 0.45);
        if (soleMat) this.box(g, sw * 0.95 + 0.006, 0.025, 0.255, soleMat, dx, 0.0125, 0.45);
      });
    }
  }

  /** Tapered two-block torso with shoulder caps. Returns the front face z. */
  private addTorso(g: THREE.Group, up: number, tw: number, td: number, mat: THREE.Material): number {
    this.box(g, tw, 0.3, td, mat, 0, 0.89 + up, 0);
    this.box(g, tw * 0.86, 0.25, td * 0.92, mat, 0, 0.625 + up, 0);
    [-1, 1].forEach((s) => {
      const cap = this.box(g, 0.12, 0.1, td * 0.92, mat, s * (tw / 2 - 0.01), 0.995 + up, 0);
      cap.rotation.z = s * -0.18;
    });
    return td / 2;
  }

  /**
   * One arm: 'lap' rests the forearm forward like the original passengers,
   * 'down' hangs at the side (for carrying). Returns the hand mesh.
   */
  private addArm(g: THREE.Group, s: number, pose: 'lap' | 'down', up: number, ax: number, sleeve: THREE.Material, skMat: THREE.Material, thick = 1, cuff?: THREE.Material, reach = 0): THREE.Mesh {
    const t = thick;
    if (pose === 'lap') {
      this.box(g, 0.095 * t, 0.32, 0.105 * t, sleeve, s * ax, 0.85 + up, 0.02);
      this.box(g, 0.085 * t, 0.085 * t, 0.25, sleeve, s * (ax - 0.035), 0.69 + up, 0.15);
      if (cuff) this.box(g, 0.09 * t, 0.09 * t, 0.03, cuff, s * (ax - 0.04), 0.69 + up, 0.27);
      const hand = this.box(g, 0.075, 0.045, 0.09, skMat, s * (ax - 0.07), 0.69 + up, 0.315);
      this.box(g, 0.025, 0.03, 0.045, skMat, s * (ax - 0.07) - s * 0.045, 0.7 + up, 0.29);
      return hand;
    }
    // Straight arm on a shoulder pivot, tipped forward by `reach` (radians).
    const pivot = new THREE.Group();
    pivot.position.set(s * ax, 1.0 + up, 0);
    pivot.rotation.x = -reach;
    g.add(pivot);
    this.box(pivot, 0.095 * t, 0.32, 0.105 * t, sleeve, 0, -0.16, 0);
    this.box(pivot, 0.085 * t, 0.26, 0.09 * t, sleeve, 0, -0.43, 0);
    if (cuff) this.box(pivot, 0.09 * t, 0.03, 0.095 * t, cuff, 0, -0.555, 0);
    const hand = this.box(pivot, 0.065, 0.09, 0.08, skMat, 0, -0.61, 0);
    this.box(pivot, 0.022, 0.04, 0.03, skMat, -s * 0.04, -0.6, 0.025);
    return hand;
  }

  private buildArchetypeBody(g: THREE.Group, cfg: PersonConfig, skMat: THREE.Material, up: number) {
    const standing = !!cfg.standing;
    const shoeMat = new THREE.MeshLambertMaterial({ color: 0x18181a });
    // Box neck, a touch longer than the mannequin's.
    this.box(g, 0.085, 0.12, 0.085, skMat, 0, 1.075 + up, 0);

    if (cfg.archetype === 'coat') {
      // Burgundy knee-length wool coat, belted, with lapels; shopping bag in the right hand.
      const coat = this.fabric(0x5e1f2a);
      const trim = this.fabric(0x431620);
      const under = this.fabric(cfg.shirt);
      const tw = 0.4;
      const td = 0.26;
      const front = this.addTorso(g, up, tw, td, coat);
      this.addLegs(g, standing, this.fabric(cfg.pants), shoeMat);
      // Shirt showing in the V, lapels over it, raised collar.
      this.box(g, 0.1, 0.12, 0.01, under, 0, 0.97 + up, front + 0.002);
      [-1, 1].forEach((s) => {
        const lapel = this.box(g, 0.075, 0.22, 0.02, trim, s * 0.06, 0.93 + up, front + 0.006);
        lapel.rotation.z = s * 0.32;
      });
      this.box(g, 0.3, 0.08, td + 0.01, trim, 0, 1.04 + up, -0.01);
      // Belt and buttons.
      this.box(g, tw * 0.86 + 0.01, 0.035, td * 0.92 + 0.01, trim, 0, 0.7 + up, 0);
      this.box(g, 0.022, 0.022, 0.01, shoeMat, 0.05, 0.8 + up, front + 0.005);
      this.box(g, 0.022, 0.022, 0.01, shoeMat, 0.05, 0.6 + up, td * 0.46 + 0.005);
      // Coat skirt: a slightly flared block down to the knees standing, draped over the lap seated.
      if (standing) {
        const geo = new THREE.CylinderGeometry(0.707, 0.8, 1, 4, 1);
        geo.rotateY(Math.PI / 4);
        const skirt = new THREE.Mesh(geo, coat);
        skirt.scale.set(0.4, 0.58, 0.27);
        skirt.position.set(0, 0.73, 0);
        g.add(skirt);
        this.box(g, 0.012, 0.56, 0.01, trim, 0.03, 0.73, 0.156);
      } else {
        this.box(g, 0.4, 0.06, 0.47, coat, 0, 0.645, 0.2);
        this.box(g, 0.39, 0.2, 0.04, coat, 0, 0.53, 0.44);
        [-1, 1].forEach((s) => this.box(g, 0.03, 0.2, 0.4, coat, s * 0.2, 0.53, 0.15));
      }
      // Arms: left on the lap, right hanging with the bag.
      const ax = tw / 2 + 0.05;
      this.addArm(g, -1, 'lap', up, ax, coat, skMat, 1, trim);
      // Standing the bag hangs at her side; seated it rests on the floor by her right shin.
      const reach = standing ? 0 : 0.57;
      this.addArm(g, 1, 'down', up, ax, coat, skMat, 1, trim, reach);
      // Kraft shopping bag with dark rope handles, hanging from the right hand.
      const bag = new THREE.Group();
      const kraft = this.fabric(0x8a6b48);
      const rope = new THREE.MeshLambertMaterial({ color: 0x1d1a17 });
      this.box(bag, 0.11, 0.3, 0.26, kraft, 0, -0.15, 0);
      this.box(bag, 0.112, 0.04, 0.262, this.fabric(0x6f5236), 0, -0.02, 0);
      [-0.05, 0.05].forEach((hz) => this.box(bag, 0.012, 0.1, 0.012, rope, 0, 0.05, hz));
      this.box(bag, 0.012, 0.012, 0.11, rope, 0, 0.1, 0);
      bag.position.set(ax + 0.03, 1.0 + up - 0.61 * Math.cos(reach) - 0.1, 0.61 * Math.sin(reach));
      g.add(bag);
      return;
    }

    if (cfg.archetype === 'mta') {
      // MTA maintenance: navy work uniform, orange hi-vis vest with reflective bands, tool belt.
      const navy = this.fabric(0x1e283a);
      const navyPants = this.fabric(0x1b2230);
      const vest = this.fabric(0xe8892e);
      vest.emissive.setHex(0x2a1406); // hi-vis fabric glows a little under the fluorescents
      const reflect = new THREE.MeshLambertMaterial({ color: 0xe4e6cf, emissive: 0x55574a });
      const tw = 0.4;
      const td = 0.25;
      const front = this.addTorso(g, up, tw, td, navy);
      this.addLegs(g, standing, navyPants, new THREE.MeshLambertMaterial({ color: 0x2a2119 }), 1.15);
      // Vest shell over chest and waist (sleeveless, so the navy sleeves and collar show).
      this.box(g, tw + 0.02, 0.29, td + 0.02, vest, 0, 0.88 + up, 0);
      this.box(g, tw * 0.86 + 0.02, 0.25, td * 0.92 + 0.02, vest, 0, 0.625 + up, 0);
      this.box(g, 0.13, 0.12, 0.012, navy, 0, 0.97 + up, front + 0.012);
      // Reflective bands: two around the body, two up over the shoulders front and back.
      this.box(g, tw + 0.03, 0.035, td + 0.03, reflect, 0, 0.8 + up, 0);
      this.box(g, tw * 0.86 + 0.03, 0.035, td * 0.92 + 0.03, reflect, 0, 0.62 + up, 0);
      [-1, 1].forEach((s) => {
        [1, -1].forEach((side) => this.box(g, 0.035, 0.26, 0.006, reflect, s * 0.1, 0.9 + up, side * (front + 0.014)));
      });
      // Collar, radio on the chest, tool belt with a pouch.
      this.box(g, 0.24, 0.07, td, navy, 0, 1.035 + up, -0.005);
      this.box(g, 0.05, 0.08, 0.03, shoeMat, -0.11, 0.93 + up, front + 0.025);
      this.box(g, 0.012, 0.06, 0.012, shoeMat, -0.125, 1.0 + up, front + 0.025);
      const leather = new THREE.MeshLambertMaterial({ color: 0x2b241c });
      this.box(g, tw * 0.86 + 0.035, 0.05, td * 0.92 + 0.035, leather, 0, 0.52 + up, 0);
      this.box(g, 0.07, 0.09, 0.08, leather, 0.19, 0.49 + up, 0.04);
      const ax = tw / 2 + 0.05;
      [-1, 1].forEach((s) => this.addArm(g, s, 'lap', up, ax, navy, skMat));
      return;
    }

    // 'puffer': bulky quilted jacket (wider, deeper torso), jeans, light sneakers.
    const shell = this.fabric(0x557a70);
    const seam = new THREE.MeshLambertMaterial({ color: 0x23332f });
    const tw = 0.48;
    const td = 0.32;
    this.box(g, tw - 0.05, 0.56, td - 0.05, seam, 0, 0.78 + up, 0);
    // Four horizontal baffles with dark seams between them.
    [0.565, 0.7, 0.835, 0.97].forEach((by, i) => {
      const shrink = i === 0 ? 0.05 : i % 2 ? 0 : 0.015;
      this.box(g, tw - shrink, 0.122, td - shrink, shell, 0, by + up, 0);
    });
    [-1, 1].forEach((s) => {
      const cap = this.box(g, 0.14, 0.13, td * 0.9, shell, s * (tw / 2 - 0.02), 0.995 + up, 0);
      cap.rotation.z = s * -0.15;
    });
    // High puffy collar and zip.
    this.box(g, 0.27, 0.11, 0.27, shell, 0, 1.08 + up, -0.01);
    this.box(g, 0.012, 0.56, 0.006, seam, 0, 0.78 + up, td / 2 + 0.004);
    this.addLegs(g, standing, this.fabric(0x3a4456), new THREE.MeshLambertMaterial({ color: 0xb9b3a6 }), 1.05, seam);
    const ax = tw / 2 + 0.06;
    [-1, 1].forEach((s) => this.addArm(g, s, 'lap', up, ax, shell, skMat, 1.35, seam));
  }

  /** Accessories that ride on the head group, so they turn with every gaze/stare. */
  private addHeadwear(head: THREE.Group, archetype: PersonArchetype) {
    if (archetype === 'mta') {
      // Low-poly hard hat: faceted dome, brim, centre ridge.
      const hat = new THREE.MeshLambertMaterial({ color: 0xd3cebf });
      const dome = new THREE.Mesh(new THREE.SphereGeometry(0.13, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2), hat);
      dome.position.set(0, 0.035, -0.005);
      dome.scale.set(0.97, 0.9, 1.05);
      head.add(dome);
      const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.014, 8), hat);
      brim.position.set(0, 0.035, 0.012);
      brim.scale.set(1, 1, 1.12);
      head.add(brim);
      this.box(head, 0.03, 0.025, 0.25, hat, 0, 0.145, -0.005);
      return;
    }
    if (archetype === 'puffer') {
      // Over-ear headphones: band over the crown, boxy cups with a muted red plate.
      const dark = new THREE.MeshLambertMaterial({ color: 0x19191c });
      const accent = new THREE.MeshLambertMaterial({ color: 0x7c2e2a });
      const band = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.013, 4, 10, Math.PI), dark);
      band.position.set(0, 0.0, -0.005);
      head.add(band);
      [-1, 1].forEach((s) => {
        this.box(head, 0.045, 0.095, 0.085, dark, s * 0.122, -0.01, -0.005);
        this.box(head, 0.008, 0.06, 0.055, accent, s * 0.147, -0.01, -0.005);
      });
    }
  }
}
