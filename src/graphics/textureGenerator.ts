/**
 * Procedural Texture Generator for Subway Cars, Station Signage, and Interior Decals
 */
import * as THREE from 'three';
import { AdDefinition } from '../constants';

export class TextureGenerator {
  public aniso: number;

  constructor(maxAniso: number = 4) {
    this.aniso = maxAniso;
  }

  public createFloorTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    // Non-skid speckled subway floor
    ctx.fillStyle = '#2b2c28';
    ctx.fillRect(0, 0, 512, 512);

    // Speckles
    for (let i = 0; i < 4000; i++) {
      const x = Math.random() * 512;
      const y = Math.random() * 512;
      const r = Math.random() * 1.5;
      ctx.fillStyle = Math.random() > 0.5 ? '#3a3c36' : '#1e1f1c';
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(8, 4);
    tex.anisotropy = this.aniso;
    return tex;
  }

  public createTactileStripTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;

    // Yellow tactile diamond/raised-dot platform warning strip
    ctx.fillStyle = '#f1c40f';
    ctx.fillRect(0, 0, 256, 64);

    ctx.fillStyle = '#b7950b';
    for (let x = 8; x < 256; x += 16) {
      for (let y = 8; y < 64; y += 16) {
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(16, 1);
    tex.anisotropy = this.aniso;
    return tex;
  }

  public createDecalTexture(type: 'sticker' | 'stain'): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d')!;

    if (type === 'sticker') {
      ctx.fillStyle = 'rgba(240, 240, 230, 0.9)';
      ctx.fillRect(10, 10, 108, 108);
      ctx.fillStyle = '#c0392b';
      ctx.fillRect(16, 16, 96, 24);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 12px sans-serif';
      ctx.fillText('EMERGENCY', 20, 33);
      ctx.fillStyle = '#222222';
      ctx.font = '9px sans-serif';
      ctx.fillText('DO NOT LEAN', 20, 60);
      ctx.fillText('ON DOORS', 20, 75);
    } else {
      // Grime/water drip stain
      const grad = ctx.createRadialGradient(64, 64, 4, 64, 64, 55);
      grad.addColorStop(0, 'rgba(40, 30, 20, 0.45)');
      grad.addColorStop(0.6, 'rgba(50, 40, 30, 0.2)');
      grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 128, 128);
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.anisotropy = this.aniso;
    return tex;
  }

  public drawAdOnCanvas(canvas: HTMLCanvasElement, def: AdDefinition, headline: string) {
    const ctx = canvas.getContext('2d')!;
    const w = canvas.width;
    const h = canvas.height;

    ctx.fillStyle = def.bg || '#1c2833';
    ctx.fillRect(0, 0, w, h);

    // Border
    ctx.strokeStyle = def.border || 'rgba(255,255,255,0.2)';
    ctx.lineWidth = 4;
    ctx.strokeRect(4, 4, w - 8, h - 8);

    // Headline
    ctx.fillStyle = def.fg || '#ffffff';
    ctx.font = 'bold 36px "Helvetica Neue", Arial, sans-serif';
    ctx.textBaseline = 'top';
    ctx.fillText(headline || def.h, 24, 24);

    // Subtitle
    if (def.sub) {
      ctx.fillStyle = '#e3a83a';
      ctx.font = 'bold 20px "Helvetica Neue", Arial, sans-serif';
      ctx.fillText(def.sub, 24, 80);
    }

    // Body
    if (def.body) {
      ctx.fillStyle = 'rgba(240, 240, 240, 0.85)';
      ctx.font = '16px "Helvetica Neue", Arial, sans-serif';
      ctx.fillText(def.body, 24, 125);
    }
  }

  public drawRouteMap(canvas: HTMLCanvasElement, _style: string) {
    const ctx = canvas.getContext('2d')!;
    const w = canvas.width;
    const h = canvas.height;

    ctx.fillStyle = '#f8f9fa';
    ctx.fillRect(0, 0, w, h);

    // Green line for G train
    ctx.strokeStyle = '#6cbe45';
    ctx.lineWidth = 14;
    ctx.beginPath();
    ctx.moveTo(30, h / 2);
    ctx.lineTo(w - 30, h / 2);
    ctx.stroke();

    // Station dots
    for (let x = 60; x < w - 40; x += 55) {
      ctx.fillStyle = '#1b1d18';
      ctx.beginPath();
      ctx.arc(x, h / 2, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(x, h / 2, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  public createStationTileTexture(repeatX: number = 72, repeatY: number = 5): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d')!;

    // White subway station wall tile grid
    ctx.fillStyle = '#e8ecf0';
    ctx.fillRect(0, 0, 128, 128);

    // Grout lines
    ctx.strokeStyle = '#a4b0be';
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, 126, 62);
    ctx.strokeRect(1, 65, 126, 62);

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(repeatX, repeatY);
    tex.anisotropy = this.aniso;
    return tex;
  }

  public createStationSignTexture(stopName: string): { texture: THREE.CanvasTexture; canvas: HTMLCanvasElement } {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 96;
    const ctx = canvas.getContext('2d')!;
    this.drawStationSign(ctx, stopName);

    const texture = new THREE.CanvasTexture(canvas);
    texture.anisotropy = this.aniso;
    return { texture, canvas };
  }

  public drawStationSign(ctx: CanvasRenderingContext2D, name: string) {
    const w = ctx.canvas.width;
    const h = ctx.canvas.height;

    // Black MTA enamel sign band
    ctx.fillStyle = '#111111';
    ctx.fillRect(0, 0, w, h);

    // White Helvetica font
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 36px "Helvetica Neue", Arial, sans-serif';
    ctx.textBaseline = 'middle';
    ctx.fillText(name || 'Court Sq', 24, h / 2);
  }
}
