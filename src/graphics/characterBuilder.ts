/**
 * Procedural 3D Character Builder for NYC Subway Passengers & Parents
 * Generates low-poly commuters with articulated heads, expressive eyes,
 * and realistic seated or standing subway poses.
 */
import * as THREE from 'three';
import { PersonObject } from '../types';

export interface CreatePersonOptions {
  tid: string;
  label: string;
  x: number;
  z: number;
  ry?: number;
  standing?: boolean;
  hy?: number;
  hp?: number;
  skin?: number;
  shirt?: number;
  pants?: number;
  hair?: number;
  hasPhone?: boolean;
}

export class CharacterBuilder {
  public createPerson(opts: CreatePersonOptions): PersonObject {
    const group = new THREE.Group();
    group.name = `passenger-${opts.tid}`;
    group.position.set(opts.x, opts.standing ? 0.9 : 0.45, opts.z);
    if (opts.ry) group.rotation.y = opts.ry;

    const skinColor = opts.skin ?? 0xd2b48c;
    const shirtColor = opts.shirt ?? 0x34495e;
    const pantsColor = opts.pants ?? 0x1b2631;
    const hairColor = opts.hair ?? 0x2c3e50;

    const skMat = new THREE.MeshStandardMaterial({ color: skinColor, roughness: 0.8 });
    const shirtMat = new THREE.MeshStandardMaterial({ color: shirtColor, roughness: 0.9 });
    const pantsMat = new THREE.MeshStandardMaterial({ color: pantsColor, roughness: 0.9 });
    const hairMat = new THREE.MeshStandardMaterial({ color: hairColor, roughness: 0.7 });

    // Torso / Coat
    const torsoHeight = opts.standing ? 0.75 : 0.65;
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.42, torsoHeight, 0.24), shirtMat);
    torso.position.y = opts.standing ? 0.35 : 0.2;
    group.add(torso);

    // Legs / Pants
    if (opts.standing) {
      const legGeo = new THREE.BoxGeometry(0.16, 0.85, 0.18);
      const leftLeg = new THREE.Mesh(legGeo, pantsMat);
      leftLeg.position.set(-0.11, -0.45, 0);
      group.add(leftLeg);

      const rightLeg = new THREE.Mesh(legGeo, pantsMat);
      rightLeg.position.set(0.11, -0.45, 0);
      group.add(rightLeg);
    } else {
      // Seated thighs
      const thighGeo = new THREE.BoxGeometry(0.16, 0.18, 0.42);
      const leftThigh = new THREE.Mesh(thighGeo, pantsMat);
      leftThigh.position.set(-0.11, -0.1, 0.18);
      group.add(leftThigh);

      const rightThigh = new THREE.Mesh(thighGeo, pantsMat);
      rightThigh.position.set(0.11, -0.1, 0.18);
      group.add(rightThigh);

      // Seated calves
      const calfGeo = new THREE.BoxGeometry(0.14, 0.42, 0.14);
      const leftCalf = new THREE.Mesh(calfGeo, pantsMat);
      leftCalf.position.set(-0.11, -0.35, 0.38);
      group.add(leftCalf);

      const rightCalf = new THREE.Mesh(calfGeo, pantsMat);
      rightCalf.position.set(0.11, -0.35, 0.38);
      group.add(rightCalf);
    }

    // Articulated Head Group
    const headGroup = new THREE.Group();
    headGroup.position.set(0, opts.standing ? 0.8 : 0.6, 0);
    if (opts.hy) headGroup.rotation.y = opts.hy;
    if (opts.hp) headGroup.rotation.x = opts.hp;
    group.add(headGroup);

    // Head Mesh
    const headMesh = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.26, 0.24), skMat);
    headGroup.add(headMesh);

    // Hair / Hat
    const hair = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.1, 0.26), hairMat);
    hair.position.y = 0.12;
    headGroup.add(hair);

    // Eyes
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0x050505 });
    const eyeGeo = new THREE.BoxGeometry(0.04, 0.04, 0.02);

    const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
    leftEye.position.set(-0.06, 0.02, 0.125);
    headGroup.add(leftEye);

    const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
    rightEye.position.set(0.06, 0.02, 0.125);
    headGroup.add(rightEye);

    // Optional Phone in hand
    let phone: THREE.Object3D | null = null;
    if (opts.hasPhone || Math.random() > 0.4) {
      const phoneMat = new THREE.MeshStandardMaterial({ color: 0x111111, metalness: 0.8 });
      phone = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.14, 0.01), phoneMat);
      phone.position.set(0.12, opts.standing ? 0.15 : 0.05, 0.2);
      phone.rotation.x = -0.6;
      group.add(phone);
    }

    return {
      g: group,
      head: headGroup,
      phone,
      eyes: [leftEye, rightEye],
      skMat,
      skin: skinColor,
      tid: opts.tid,
      label: opts.label,
      home: new THREE.Vector3(opts.x, opts.standing ? 0.9 : 0.45, opts.z),
      pose: [opts.hy ?? 0, opts.hp ?? 0],
    };
  }
}
