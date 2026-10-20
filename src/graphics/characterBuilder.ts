/**
 * 3D Stylized Character Mesh Generator for LAST LOCAL
 * Builds stylized passengers with realistic anatomical proportions, layered clothing,
 * articulated heads for gaze tracking, and specific anomaly state controls.
 */
import * as THREE from 'three';
import { PersonObject } from '../types';
import { DEFAULT_STANDING_SPRITE, SPRITE_CHARACTERS, spriteFrameIndex, spriteFrames } from './spriteCharacters';

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
  keep?: () => boolean;
}

export class CharacterBuilder {
  /**
   * Builds an articulated passenger mesh group
   */
  public createPerson(cfg: PersonConfig): PersonObject {
    // TEST: standing passengers are drawn as an 8-facing pixel-art billboard instead of the box figure.
    if (cfg.standing) return this.createSpritePerson(cfg, DEFAULT_STANDING_SPRITE);

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

  /**
   * Standing passenger drawn as a Doom-style billboard: an upright quad that yaws to face the
   * camera, showing whichever of the 8 facing frames matches the angle between the head's
   * facing and the camera. Every PersonObject field stays real so gaze, anomalies and photos
   * keep working: the head Group still turns (and picks the frame), eyes are invisible
   * placeholders, and skMat changes tint the sprite.
   */
  private createSpritePerson(cfg: PersonConfig, character: string): PersonObject {
    const def = SPRITE_CHARACTERS[character];
    const frames = spriteFrames(character);
    const g = new THREE.Group();
    const up = 0.48;

    // Same height as the box figure: head centre at 1.70 m, crown at ~1.82 m, feet on the floor.
    const figureHeight = 1.22 + up + 0.112 * 1.08;
    const px = figureHeight / (def.feetRow - def.topRow);
    const quadSize = def.size * px;

    const skMat = new THREE.MeshLambertMaterial({ color: cfg.skin });
    const spriteMat = new THREE.MeshLambertMaterial({
      map: frames[0],
      alphaTest: 0.5,
      side: THREE.DoubleSide,
    });
    const sprite = new THREE.Mesh(new THREE.PlaneGeometry(quadSize, quadSize), spriteMat);
    sprite.position.set(0, (def.feetRow - def.size / 2) * px, 0);
    g.add(sprite);

    // Articulated head: invisible, but its rotation is the passenger's facing for frame selection.
    const head = new THREE.Group();
    head.rotation.order = 'YXZ';
    head.position.set(0, 1.22 + up, 0);
    g.add(head);

    // Eye placeholders, so code that scales eyes has something harmless to touch.
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0x111113 });
    const eyes: THREE.Mesh[] = [-0.038, 0.038].map((ex) => {
      const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.013, 6, 4), eyeMat);
      pupil.position.set(ex, 0.016, 0.106);
      pupil.visible = false;
      head.add(pupil);
      return pupil;
    });

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

    const skinColor = new THREE.Color(cfg.skin);
    sprite.onBeforeRender = (_renderer, _scene, camera) => {
      const gm = g.matrixWorld.elements;
      const hm = head.matrixWorld.elements;
      const cm = camera.matrixWorld.elements;
      // Direction from the figure to the camera, on the floor plane.
      const toCamX = cm[12] - gm[12];
      const toCamZ = cm[14] - gm[14];

      // Staring at / facing the player always reads as the front frame.
      const locked = person.stare || person.facing || person.mode === 'player';
      // The head's forward (+Z) in world space is the facing.
      const idx = locked ? 0 : spriteFrameIndex(hm[8], hm[10], toCamX, toCamZ);
      spriteMat.map = frames[idx];

      // Skin colour changes (anomalies) tint the whole sprite; normal skin = untinted.
      if (skMat.color.equals(skinColor)) spriteMat.color.setRGB(1, 1, 1);
      else spriteMat.color.copy(skMat.color);

      // Yaw-only billboard: turn the quad to face the camera, relative to the group's own yaw.
      const parentYaw = Math.atan2(gm[8], gm[10]);
      sprite.rotation.y = Math.atan2(toCamX, toCamZ) - parentYaw;
      sprite.updateMatrix();
      sprite.matrixWorld.multiplyMatrices(g.matrixWorld, sprite.matrix);
    };

    return person;
  }
}
