/**
 * High-fidelity procedural textures and sprites for LAST LOCAL
 * Generates subway flooring, authentic NYC MTA advertising, G-train route strip maps,
 * station tile mosaics, warning tactile strips, and anomaly variants.
 */
import * as THREE from 'three';
import { AdDefinition, STOPS } from '../constants';

export class TextureGenerator {
  private aniso: number = 8;

  constructor(maxAniso: number = 8) {
    this.aniso = maxAniso;
  }

  /**
   * High-resolution speckled non-slip MTA rubber floor
   */
  public createFloorTexture(): THREE.CanvasTexture {
    const w = 512, h = 512;
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d')!;

    // Base dirty mottled grey vinyl
    ctx.fillStyle = '#5a5852';
    ctx.fillRect(0, 0, w, h);

    // Speckles (black, off-white, light ochre aggregate flecks)
    const imgData = ctx.getImageData(0, 0, w, h);
    const data = imgData.data;
    for (let i = 0; i < data.length; i += 4) {
      const noise = (Math.random() - 0.5) * 24;
      data[i] = Math.min(255, Math.max(0, data[i] + noise));
      data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + noise));
      data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + noise));
    }
    ctx.putImageData(imgData, 0, 0);

    // Decorative speckled chips
    for (let i = 0; i < 4000; i++) {
      const rx = Math.random() * w;
      const ry = Math.random() * h;
      const randColor = Math.random();
      if (randColor < 0.35) {
        ctx.fillStyle = 'rgba(230, 226, 212, 0.45)';
      } else if (randColor < 0.7) {
        ctx.fillStyle = 'rgba(28, 29, 26, 0.5)';
      } else {
        ctx.fillStyle = 'rgba(180, 160, 130, 0.35)';
      }
      const s = 1.2 + Math.random() * 2.2;
      ctx.fillRect(rx, ry, s, s);
    }

    // Floor panel seam lines
    ctx.strokeStyle = 'rgba(30, 30, 26, 0.4)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, h / 2);
    ctx.lineTo(w, h / 2);
    ctx.stroke();

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(8, 2);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = this.aniso;
    return tex;
  }

  /**
   * Yellow tactile warning strip at train doors
   */
  public createTactileStripTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#d89b18';
    ctx.fillRect(0, 0, 256, 64);

    // Raised bump dots
    for (let x = 8; x < 256; x += 16) {
      for (let y = 8; y < 64; y += 16) {
        ctx.fillStyle = '#eed638';
        ctx.beginPath();
        ctx.arc(x, y, 4.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#8a5c05';
        ctx.beginPath();
        ctx.arc(x + 1, y + 1, 4.5, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(4, 1);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  /**
   * Stainless steel brushed texture with horizontal micro-grain
   */
  public createBrushedSteelTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#b0b5b8';
    ctx.fillRect(0, 0, 256, 256);

    for (let y = 0; y < 256; y++) {
      const alpha = 0.04 + Math.random() * 0.12;
      const shade = Math.random() > 0.5 ? 255 : 40;
      ctx.fillStyle = `rgba(${shade},${shade},${shade},${alpha})`;
      ctx.fillRect(0, y, 256, 1);
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(2, 6);
    return tex;
  }

  /**
   * Station mosaic subway tile texture
   */
  public createStationTileTexture(tileScaleX: number, tileScaleY: number): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#ede8d8';
    ctx.fillRect(0, 0, 256, 256);

    // Grout lines
    ctx.strokeStyle = '#9e9784';
    ctx.lineWidth = 2.5;

    const cols = 8;
    const rows = 16;
    const cw = 256 / cols;
    const rh = 256 / rows;

    for (let r = 0; r <= rows; r++) {
      const y = r * rh;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(256, y);
      ctx.stroke();
    }

    for (let r = 0; r < rows; r++) {
      const offset = (r % 2) * (cw / 2);
      for (let c = -1; c <= cols + 1; c++) {
        const x = c * cw + offset;
        ctx.beginPath();
        ctx.moveTo(x, r * rh);
        ctx.lineTo(x, (r + 1) * rh);
        ctx.stroke();
      }
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(tileScaleX, tileScaleY);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = this.aniso;
    return tex;
  }

  /**
   * Station Wall Name Plate Canvas Texture
   */
  public createStationSignTexture(stationName: string): { texture: THREE.CanvasTexture; canvas: HTMLCanvasElement } {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 112;
    const ctx = canvas.getContext('2d')!;

    this.drawStationSign(ctx, stationName);

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = this.aniso;
    return { texture: tex, canvas };
  }

  public drawStationSign(ctx: CanvasRenderingContext2D, stationName: string) {
    // NYC Subway Mosaic Plaque Border
    ctx.fillStyle = '#1c241e';
    ctx.fillRect(0, 0, 512, 112);

    // Green mosaic band border
    ctx.fillStyle = '#3c754a';
    ctx.fillRect(6, 6, 500, 100);

    ctx.fillStyle = '#0f1411';
    ctx.fillRect(14, 14, 484, 84);

    // Clean white station typography
    ctx.fillStyle = '#f5f4ed';
    let fontSize = 48;
    ctx.font = `800 ${fontSize}px "Archivo", "Helvetica Neue", Arial, sans-serif`;
    while (fontSize > 24 && ctx.measureText(stationName).width > 440) {
      fontSize -= 2;
      ctx.font = `800 ${fontSize}px "Archivo", "Helvetica Neue", Arial, sans-serif`;
    }
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(stationName, 256, 56);
  }

  /**
   * Window decals (sticker / mystery water stain)
   */
  public createDecalTexture(kind: 'sticker' | 'stain'): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;

    if (kind === 'sticker') {
      // Vintage NYC subway warning or retro smiley sticker
      ctx.fillStyle = '#f5cc1b';
      ctx.beginPath();
      ctx.arc(128, 128, 112, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#181818';
      ctx.beginPath();
      ctx.arc(92, 100, 14, 0, Math.PI * 2);
      ctx.arc(164, 100, 14, 0, Math.PI * 2);
      ctx.fill();

      ctx.lineWidth = 14;
      ctx.lineCap = 'round';
      ctx.strokeStyle = '#181818';
      ctx.beginPath();
      ctx.arc(128, 138, 52, 0.3, Math.PI - 0.3);
      ctx.stroke();

      // Border ring
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.arc(128, 128, 114, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      // Condensation / grime drip stain
      const grad = ctx.createRadialGradient(128, 128, 8, 128, 128, 118);
      grad.addColorStop(0, 'rgba(120, 95, 60, 0.88)');
      grad.addColorStop(0.5, 'rgba(100, 80, 50, 0.45)');
      grad.addColorStop(0.85, 'rgba(80, 65, 40, 0.15)');
      grad.addColorStop(1, 'rgba(60, 50, 30, 0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 256, 256);

      // Organic drip lines
      ctx.strokeStyle = 'rgba(110, 85, 55, 0.5)';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(120, 128);
      ctx.bezierCurveTo(122, 180, 114, 210, 118, 240);
      ctx.stroke();
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  /**
   * Draw high-craft subway ad with authentic logo and layout
   */
  public drawAdOnCanvas(canvas: HTMLCanvasElement, def: AdDefinition, headline: string, overrideBg?: string) {
    const ctx = canvas.getContext('2d')!;
    const w = canvas.width;
    const h = canvas.height;

    const bg = overrideBg || def.bg;
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    // Left accent bar
    ctx.fillStyle = def.ac;
    ctx.fillRect(0, 0, 26, h);

    // Inner subtle card border
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.lineWidth = 2;
    ctx.strokeRect(32, 10, w - 44, h - 20);

    // Graphic emblem based on brand
    ctx.save();
    ctx.translate(w - 74, 52);
    this.drawBrandLogo(ctx, def.logoType || 'bank', def.ac, def.fg);
    ctx.restore();

    // Bold, punchy headline
    ctx.fillStyle = def.fg;
    ctx.textBaseline = 'alphabetic';
    ctx.font = '800 60px "Archivo", "Arial Narrow", Arial, sans-serif';
    ctx.fillText(headline, 52, 88, w - 150);

    // Tagline / subhead
    ctx.globalAlpha = 0.9;
    ctx.font = '600 28px "Archivo", Arial, sans-serif';
    ctx.fillText(def.sub, 52, 136, w - 120);

    // Fine print / NYC contact info
    ctx.globalAlpha = 0.72;
    ctx.font = '500 20px "Archivo", Arial, sans-serif';
    ctx.fillText(def.fine, 52, 172, w - 120);

    ctx.globalAlpha = 1.0;
  }

  private drawBrandLogo(ctx: CanvasRenderingContext2D, type: string, ac: string, fg: string) {
    ctx.strokeStyle = ac;
    ctx.fillStyle = ac;
    ctx.lineWidth = 3;

    switch (type) {
      case 'bank':
        // Classical bank vault / column pediment
        ctx.beginPath();
        ctx.moveTo(-20, -10);
        ctx.lineTo(0, -26);
        ctx.lineTo(20, -10);
        ctx.closePath();
        ctx.stroke();
        [-12, -4, 4, 12].forEach((x) => {
          ctx.fillRect(x - 1.5, -8, 3, 24);
        });
        ctx.fillRect(-22, 16, 44, 4);
        break;
      case 'tooth':
        // Stylized tooth
        ctx.beginPath();
        ctx.arc(-8, -12, 10, Math.PI, 0);
        ctx.arc(8, -12, 10, Math.PI, 0);
        ctx.bezierCurveTo(18, 10, 8, 24, 6, 26);
        ctx.lineTo(0, 8);
        ctx.lineTo(-6, 26);
        ctx.bezierCurveTo(-8, 24, -18, 10, -18, -12);
        ctx.fill();
        break;
      case 'bed':
        // Crescent moon & mattress star
        ctx.beginPath();
        ctx.arc(0, 0, 18, 0.4, Math.PI * 1.5);
        ctx.arc(-6, -4, 14, Math.PI * 1.5, 0.4, true);
        ctx.fill();
        ctx.fillRect(10, 8, 4, 4);
        break;
      case 'wrench':
        // Gear & wrench
        ctx.beginPath();
        ctx.arc(0, 0, 16, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(0, 0, 6, 0, Math.PI * 2);
        ctx.fill();
        break;
      case 'courtesy':
        // Friendly passenger figure silhouette
        ctx.beginPath();
        ctx.arc(0, -14, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.roundRect(-12, -4, 24, 28, 4);
        ctx.fill();
        break;
      case 'diner':
        // Steaming diner mug
        ctx.beginPath();
        ctx.roundRect(-12, -8, 20, 26, 3);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(8, 2, 6, -Math.PI / 2, Math.PI / 2);
        ctx.stroke();
        break;
      case 'tax':
        // Government ledger badge
        ctx.strokeRect(-14, -18, 28, 36);
        ctx.beginPath();
        ctx.moveTo(-8, -6);
        ctx.lineTo(8, -6);
        ctx.moveTo(-8, 4);
        ctx.lineTo(8, 4);
        ctx.stroke();
        break;
      case 'cross':
        // Medical cross
        ctx.fillRect(-6, -18, 12, 36);
        ctx.fillRect(-18, -6, 36, 12);
        break;
      case 'book':
        // Open book
        ctx.beginPath();
        ctx.moveTo(0, 14);
        ctx.bezierCurveTo(-12, 6, -20, 12, -22, -10);
        ctx.lineTo(0, -6);
        ctx.lineTo(22, -10);
        ctx.bezierCurveTo(20, 12, 12, 6, 0, 14);
        ctx.fill();
        break;
      default:
        ctx.beginPath();
        ctx.arc(0, 0, 16, 0, Math.PI * 2);
        ctx.stroke();
        break;
    }
  }

  /**
   * Route Strip Map: G Train Brooklyn to Queens
   */
  public drawRouteMap(canvas: HTMLCanvasElement, variant: 'normal' | 'extra' | 'color' = 'normal') {
    const ctx = canvas.getContext('2d')!;
    const w = canvas.width;
    const h = canvas.height;

    // Header background
    ctx.fillStyle = '#f6f4eb';
    ctx.fillRect(0, 0, w, h);

    // G train bullet icon
    ctx.fillStyle = variant === 'color' ? '#e07a2e' : '#6cbe45';
    ctx.beginPath();
    ctx.arc(36, 36, 20, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = '800 24px "Archivo", "Helvetica Neue", Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('G', 36, 37);

    // Direction subtitle
    ctx.fillStyle = '#1c1f1a';
    ctx.textAlign = 'left';
    ctx.font = '700 20px "Archivo", Arial, sans-serif';
    ctx.fillText('Church Av-bound   ⟷   Court Sq-bound', 70, 36);

    // Stops list
    const names = STOPS.slice(1);
    if (variant === 'extra') {
      names.splice(6, 0, 'Hollow St');
    }

    const n = names.length;
    const startX = 40;
    const endX = w - 40;
    const step = (endX - startX) / (n - 1);
    const lineY = 96;

    // Main route track line
    ctx.strokeStyle = variant === 'color' ? '#e07a2e' : '#6cbe45';
    ctx.lineWidth = 10;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(startX, lineY);
    ctx.lineTo(endX, lineY);
    ctx.stroke();

    // Station nodes and slanted text
    names.forEach((name, i) => {
      const px = startX + i * step;

      // Outer circle
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(px, lineY, 7.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#1b1d18';
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // Slanted label
      ctx.save();
      ctx.translate(px + 4, lineY + 14);
      ctx.rotate(0.58);
      ctx.fillStyle = '#1b1d18';
      ctx.font = '600 13px "Archivo", Arial, sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(name, 0, 0);
      ctx.restore();
    });
  }
}
