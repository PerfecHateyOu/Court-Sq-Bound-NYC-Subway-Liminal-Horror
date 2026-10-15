/**
 * Polaroid 600 Camera & Evidence Photo Management System
 * Handles viewfinder overlay, mechanical shutter discharge, high-voltage flash,
 * WebGL canvas capture, automated anomaly frustum validation, and the evidence photo album.
 */
import * as THREE from 'three';
import { PolaroidPhoto } from '../types';
import { audioEngine } from '../audio/audioEngine';

export class PolaroidManager {
  public isViewfinderOpen: boolean = false;
  public remainingFilm: number = 8;
  public maxFilm: number = 10;
  public photos: PolaroidPhoto[] = [];
  public lastCapturedPhoto: PolaroidPhoto | null = null;
  public isDeveloping: boolean = false;
  public flashActive: boolean = false;
  public flashUntil: number = 0;
  public isAlbumOpen: boolean = false;

  private frustum = new THREE.Frustum();
  private projScreenMatrix = new THREE.Matrix4();
  private tempVec = new THREE.Vector3();

  public onStateChanged?: () => void;
  public onPhotoSnapped?: (photo: PolaroidPhoto) => void;

  public toggleViewfinder(): boolean {
    this.isViewfinderOpen = !this.isViewfinderOpen;
    if (this.isViewfinderOpen) {
      this.isAlbumOpen = false;
    }
    this.notify();
    return this.isViewfinderOpen;
  }

  public setViewfinder(open: boolean) {
    if (this.isViewfinderOpen !== open) {
      this.isViewfinderOpen = open;
      if (open) this.isAlbumOpen = false;
      this.notify();
    }
  }

  public toggleAlbum(): boolean {
    this.isAlbumOpen = !this.isAlbumOpen;
    if (this.isAlbumOpen) {
      this.isViewfinderOpen = false;
    }
    this.notify();
    return this.isAlbumOpen;
  }

  public setAlbum(open: boolean) {
    if (this.isAlbumOpen !== open) {
      this.isAlbumOpen = open;
      if (open) this.isViewfinderOpen = false;
      this.notify();
    }
  }

  public replenishFilm(amount: number = 4) {
    this.remainingFilm = Math.min(this.maxFilm, this.remainingFilm + amount);
    this.notify();
  }

  /**
   * Snaps a Polaroid photo:
   * 1. Captures WebGL canvas snapshot
   * 2. Evaluates active anomalies in camera frustum
   * 3. Plays authentic shutter and film ejection audio
   * 4. Triggers flash burst and chemical development
   */
  public snapPhoto(
    camera: THREE.PerspectiveCamera,
    renderer: THREE.WebGLRenderer,
    activeAnomalies: Array<{ id: string; desc: string; obj: THREE.Object3D | null; at: number | null }>,
    carIndex: number,
    routeId: 'G' | 'L' | '7',
    gameTime: number
  ): PolaroidPhoto | null {
    if (this.remainingFilm <= 0) {
      audioEngine.blip();
      return null;
    }

    this.remainingFilm--;
    this.flashActive = true;
    this.flashUntil = performance.now() + 220;

    // Trigger audio
    audioEngine.polaroidShutter();

    // 1. Evaluate camera frustum for anomalies
    this.projScreenMatrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    this.frustum.setFromProjectionMatrix(this.projScreenMatrix);

    let foundAnomaly: { id: string; desc: string } | null = null;
    const camPos = camera.position;
    const camDir = new THREE.Vector3();
    camera.getWorldDirection(camDir);

    for (const anom of activeAnomalies) {
      if (anom.at === null) continue; // Not triggered yet

      if (anom.obj) {
        anom.obj.getWorldPosition(this.tempVec);
        const dist = camPos.distanceTo(this.tempVec);

        if (dist < 18) {
          const toTarget = this.tempVec.clone().sub(camPos).normalize();
          const angle = camDir.angleTo(toTarget);

          // Within ~38 degree cone of center viewfinder or within frustum
          if (angle < 0.65 && this.frustum.containsPoint(this.tempVec)) {
            foundAnomaly = { id: anom.id, desc: anom.desc };
            break;
          }
        }
      } else {
        // Full-screen / lighting / ambient anomaly: check if looking inside car
        foundAnomaly = { id: anom.id, desc: anom.desc };
        break;
      }
    }

    // 2. Snapshot WebGL canvas
    let dataUrl = '';
    try {
      // Create cropped 480x480 square thumbnail representing the Polaroid 1:1 image area
      const canvas = renderer.domElement;
      const offscreen = document.createElement('canvas');
      const size = 480;
      offscreen.width = size;
      offscreen.height = size;
      const ctx = offscreen.getContext('2d');

      if (ctx) {
        const minDim = Math.min(canvas.width, canvas.height);
        const sx = (canvas.width - minDim) / 2;
        const sy = (canvas.height - minDim) / 2;

        // Draw center square crop
        ctx.drawImage(canvas, sx, sy, minDim, minDim, 0, 0, size, size);

        // Apply vintage Polaroid film tint and slight vignetting
        ctx.fillStyle = 'rgba(240, 220, 190, 0.08)';
        ctx.fillRect(0, 0, size, size);

        dataUrl = offscreen.toDataURL('image/jpeg', 0.82);
      } else {
        dataUrl = canvas.toDataURL('image/jpeg', 0.6);
      }
    } catch (e) {
      console.warn('Polaroid snapshot canvas capture failed:', e);
      dataUrl = '';
    }

    const photo: PolaroidPhoto = {
      id: `polaroid_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: gameTime,
      dataUrl,
      carIndex,
      routeId,
      hasAnomalyInFrustum: !!foundAnomaly,
      anomalyName: foundAnomaly ? foundAnomaly.desc : undefined,
      exposureQuality: Math.round(80 + Math.random() * 20),
      description: foundAnomaly
        ? `[CONFIRMED ANOMALOUS] ${foundAnomaly.desc}`
        : 'Transit interior baseline - No anomalous variance detected',
    };

    this.photos.unshift(photo);
    if (this.photos.length > 16) {
      this.photos.pop(); // Retain most recent 16 prints
    }

    this.lastCapturedPhoto = photo;
    this.isDeveloping = true;

    // Reset developing state after chemical development completes (4.0s)
    setTimeout(() => {
      this.isDeveloping = false;
      this.notify();
    }, 4200);

    // End flash
    setTimeout(() => {
      this.flashActive = false;
      this.notify();
    }, 220);

    if (this.onPhotoSnapped) {
      this.onPhotoSnapped(photo);
    }

    this.notify();
    return photo;
  }

  private notify() {
    if (this.onStateChanged) {
      this.onStateChanged();
    }
  }
}

export const polaroidManager = new PolaroidManager();
