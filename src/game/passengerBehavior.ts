/**
 * Passenger NPC Reactive Behavior & Gaze Tracking State Machine
 * Implements:
 * - Dynamic gaze tracking IK targeting player camera
 * - Direct-stare aversion vs uncanny unblinking stare
 * - Synchronized chorus turns during low sanity or active anomalies
 * - Camera flash startle reaction (pupil flare, neck twitch, freeze)
 * - Subtle paranoid twitches and breathing head bob
 */
import * as THREE from 'three';
import { PersonObject } from '../types';

export class PassengerBehaviorManager {
  private targetVec = new THREE.Vector3();
  private lookDir = new THREE.Vector3();
  private passengerWorldPos = new THREE.Vector3();
  private syncChorusActive: boolean = false;
  private chorusUntil: number = 0;

  /**
   * Updates all passengers in the active train consist:
   */
  public updatePassengers(
    passengers: PersonObject[],
    playerPos: THREE.Vector3,
    playerDir: THREE.Vector3,
    sanityTier: number,
    hasActiveAnomaly: boolean,
    gameTime: number,
    dt: number,
    skip: readonly PersonObject[] = []
  ) {
    // Check if synchronized chorus should trigger
    if (sanityTier >= 2 && Math.random() < 0.003 && gameTime > this.chorusUntil) {
      this.syncChorusActive = true;
      this.chorusUntil = gameTime + 4.5 + sanityTier * 1.5;
    } else if (gameTime > this.chorusUntil) {
      this.syncChorusActive = false;
    }

    passengers.forEach((p, idx) => {
      if (!p.g || !p.head || !p.g.visible) return;
      // Skipped figures (the parents) keep the head and yaw/pitch their own logic sets.
      if (skip.includes(p)) return;

      p.g.getWorldPosition(this.passengerWorldPos);
      const distToPlayer = this.passengerWorldPos.distanceTo(playerPos);

      // Flash startle reaction recovery
      if (p.flashReactionUntil && gameTime < p.flashReactionUntil) {
        // Tense frozen posture with eyes flared
        p.head.rotation.x = -0.15;
        p.head.rotation.y += Math.sin(gameTime * 45) * 0.015;
        p.eyes.forEach((eye) => eye.scale.set(1.4, 1.4, 1.4));
        return;
      } else if (p.flashReactionUntil && gameTime >= p.flashReactionUntil) {
        p.flashReactionUntil = undefined;
        p.eyes.forEach((eye) => eye.scale.set(1, 1, 1));
      }

      // Check if player is directly looking at this passenger
      this.lookDir.subVectors(this.passengerWorldPos, playerPos).normalize();
      const dot = playerDir.dot(this.lookDir);
      const playerStaringAtMe = dot > 0.94 && distToPlayer < 7.0;

      // Calculate target head angle towards player
      const dx = playerPos.x - this.passengerWorldPos.x;
      const dz = playerPos.z - this.passengerWorldPos.z;
      const dy = playerPos.y - (this.passengerWorldPos.y + 0.85);

      // Angle from passenger forward vector to player
      // Facing depends on passenger pose
      const angleToPlayer = Math.atan2(dx, dz);
      let targetYaw = p.pose[0];
      let targetPitch = p.pose[1];

      // Gaze state decision tree:
      if (this.syncChorusActive || (hasActiveAnomaly && sanityTier >= 2)) {
        // SYNCHRONIZED CHORUS: All passengers turn in unison to stare directly at player
        targetYaw = angleToPlayer;
        targetPitch = -Math.atan2(dy, Math.sqrt(dx * dx + dz * dz));
        p.uncannyAvert = false;
      } else if (playerStaringAtMe) {
        if (sanityTier <= 1) {
          // Normal/High sanity: Avert eyes awkwardly downward / away
          targetYaw = p.pose[0] + (idx % 2 === 0 ? 0.35 : -0.35);
          targetPitch = 0.45; // Looking down at knees/phone
          p.uncannyAvert = true;
        } else {
          // Low/Critical sanity: Dead-eyed lock onto player
          targetYaw = angleToPlayer;
          targetPitch = -Math.atan2(dy, Math.sqrt(dx * dx + dz * dz));
          p.uncannyAvert = false;
        }
      } else if (distToPlayer < 6.5) {
        // Player is nearby but looking away: passenger subtly looks up at player!
        targetYaw = THREE.MathUtils.lerp(p.pose[0], angleToPlayer, 0.65);
        targetPitch = THREE.MathUtils.lerp(p.pose[1], -Math.atan2(dy, Math.sqrt(dx * dx + dz * dz)), 0.5);
      } else {
        // Idle commute behavior: reading, looking forward
        p.twitchTimer = (p.twitchTimer || 0) - dt;
        if (p.twitchTimer <= 0) {
          p.twitchTimer = 3.0 + Math.random() * 4.0;
          p.yaw = p.pose[0] + (Math.random() * 0.2 - 0.1);
          p.pitch = p.pose[1] + (Math.random() * 0.15 - 0.05);
        }
        targetYaw = p.yaw ?? p.pose[0];
        targetPitch = p.pitch ?? p.pose[1];
      }

      // Clamp yaw and pitch within human neck anatomical limits (-75 deg to +75 deg)
      const maxAngle = 1.3;
      targetYaw = Math.max(p.pose[0] - maxAngle, Math.min(p.pose[0] + maxAngle, targetYaw));
      targetPitch = Math.max(-0.4, Math.min(0.65, targetPitch));

      // Slerp head orientation smoothly
      const turnSpeed = this.syncChorusActive ? 5.5 : p.uncannyAvert ? 7.0 : 2.5;
      p.head.rotation.y = THREE.MathUtils.lerp(p.head.rotation.y, targetYaw, Math.min(1, dt * turnSpeed));
      p.head.rotation.x = THREE.MathUtils.lerp(p.head.rotation.x, targetPitch, Math.min(1, dt * turnSpeed));

      // Uncanny micro-tremor when sanity is critical
      if (sanityTier === 3) {
        p.head.rotation.z = Math.sin(gameTime * 22 + idx * 3) * 0.025;
      } else {
        p.head.rotation.z = 0;
      }
    });
  }

  /**
   * Triggers startling reaction to camera flash
   */
  public handleCameraFlash(passengers: PersonObject[], flashPos: THREE.Vector3, gameTime: number) {
    passengers.forEach((p) => {
      if (!p.g || !p.g.visible) return;
      p.g.getWorldPosition(this.passengerWorldPos);
      const dist = this.passengerWorldPos.distanceTo(flashPos);

      if (dist < 8.5) {
        // Startled reaction for 1.8 seconds
        p.flashReactionUntil = gameTime + 1.8;
      }
    });
  }
}

export const passengerBehavior = new PassengerBehaviorManager();
