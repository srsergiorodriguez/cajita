import { appState } from "$stores/appState.svelte";

export const FUSION_EFFECTS = {

  // ==========================================
  // 1. TEXTURE & PRINT (The Analog Layer)
  // ==========================================

  photocopy: {
    name: 'Bad Photocopy',
    min: 0, max: 100, step: 1, unit: '%',
    apply: (ctx, val, w, h) => {
      if (val <= 0) return;
      const imageData = ctx.getImageData(0, 0, w, h);
      const data = imageData.data;
      const threshold = 128;
      const degradation = val / 100;

      for (let i = 0; i < data.length; i += 4) {
        let r = data[i], g = data[i+1], b = data[i+2];
        let lum = 0.299 * r + 0.587 * g + 0.114 * b;

        const x = (i / 4) % w;
        const y = Math.floor((i / 4) / w);

        // 1. Roller Banding (Mechanical unevenness)
        const band1 = Math.sin(y * 0.021 + val);
        const band2 = Math.sin(y * 0.053 - val * 0.5) * 0.5;
        const rollers = band1 + band2; 

        // 2. Glass Smudges (Organic dirt patches)
        const smudge1 = Math.cos(x * 0.011 + y * 0.007);
        const smudge2 = Math.sin(x * 0.037 - y * 0.019) * 0.5;
        const glass = smudge1 + smudge2;

        // 3. Phase Modulation 
        const unevenLight = Math.sin(rollers * 2.0 + glass * 1.5) * (70 * degradation);
        
        lum += unevenLight;

        // High frequency toner scatter
        if (Math.random() < degradation * 0.6) {
            lum += (Math.random() - 0.5) * (250 * degradation);
        }

        // Hard contrast crush
        const finalVal = lum > threshold ? 255 : 0; 
        
        // Faded toner logic
        const inkColor = finalVal === 0 ? Math.floor(40 * degradation) : 255;

        data[i] = data[i+1] = data[i+2] = inkColor;
      }
      ctx.putImageData(imageData, 0, 0);
    }
  },

  halftone: {
    name: 'Newsprint Halftone',
    min: 2, max: 30, step: 1, unit: 'px',
    apply: (ctx, val, w, h) => {
      if (val <= 1) return;
      const imageData = ctx.getImageData(0, 0, w, h);
      const data = imageData.data;
      const step = Math.floor(val);

      const bgR = data[0], bgG = data[1], bgB = data[2];
      ctx.fillStyle = `rgb(${bgR},${bgG},${bgB})`;
      ctx.fillRect(0, 0, w, h);

      for (let y = 0; y < h; y += step) {
        for (let x = 0; x < w; x += step) {
          const i = (y * w + x) * 4;
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];

          const brightness = (0.299 * r + 0.587 * g + 0.114 * b);
          const radius = (1 - (brightness / 255)) * (step / 1.5);

          if (radius > 0.5) {
            ctx.beginPath();
            ctx.arc(x + step / 2, y + step / 2, radius, 0, Math.PI * 2);
            ctx.fillStyle = `rgb(${r},${g},${b})`;
            ctx.fill();
          }
        }
      }
    }
  },

  dither: {
    name: '1-Bit Dither',
    isToggle: true,
    min: 0, max: 1, step: 1, unit: '',
    apply: (ctx, val, w, h) => {
      const imageData = ctx.getImageData(0, 0, w, h);
      const data = imageData.data;
      
      const bayer = [
        [  0, 128,  32, 160 ],
        [ 192,  64, 224,  96 ],
        [  48, 176,  16, 144 ],
        [ 240, 112, 208,  80 ]
      ];

      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const i = (y * w + x) * 4;
          const brightness = (data[i] + data[i+1] + data[i+2]) / 3;
          
          const threshold = bayer[y % 4][x % 4];
          const color = brightness > threshold ? 255 : 0;
          
          data[i] = data[i+1] = data[i+2] = color;
        }
      }
      ctx.putImageData(imageData, 0, 0);
    }
  },

  stochastic: {
    name: 'Stochastic Sand',
    min: 0, max: 100, step: 1, unit: '%',
    apply: (ctx, val, w, h) => {
      if (val <= 0) return;
      const imageData = ctx.getImageData(0, 0, w, h);
      const data = imageData.data;
      const intensity = val / 100; 

      for (let i = 0; i < data.length; i += 4) {
        let r = data[i], g = data[i+1], b = data[i+2];
        let lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255; 

        const ditherDot = Math.random() > lum ? 0 : 255;

        data[i]   = r * (1 - intensity) + ditherDot * intensity;
        data[i+1] = g * (1 - intensity) + ditherDot * intensity;
        data[i+2] = b * (1 - intensity) + ditherDot * intensity;
      }
      ctx.putImageData(imageData, 0, 0);
    }
  },

  inkBleed: {
    name: 'Ink Bleed',
    min: 1, max: 5, step: 1, unit: 'px',
    apply: (ctx, val, w, h) => {
      const iterations = Math.floor(val);
      if (iterations === 0) return;

      for (let iter = 0; iter < iterations; iter++) {
        const imageData = ctx.getImageData(0, 0, w, h);
        const data = imageData.data;
        const output = new Uint8ClampedArray(data);

        for (let y = 1; y < h - 1; y++) {
          for (let x = 1; x < w - 1; x++) {
            const i = (y * w + x) * 4;
            
            const n = ((y - 1) * w + x) * 4;
            const s = ((y + 1) * w + x) * 4;
            const e = (y * w + (x + 1)) * 4;
            const w_idx = (y * w + (x - 1)) * 4;

            output[i]   = Math.min(data[i], data[n], data[s], data[e], data[w_idx]);
            output[i+1] = Math.min(data[i+1], data[n+1], data[s+1], data[e+1], data[w_idx+1]);
            output[i+2] = Math.min(data[i+2], data[n+2], data[s+2], data[e+2], data[w_idx+2]);
          }
        }
        ctx.putImageData(new ImageData(output, w, h), 0, 0);
      }
    }
  },

  filmGrain: {
    name: 'Film Grain',
    min: 0, max: 100, step: 1, unit: '%',
    apply: (ctx, val, w, h) => {
      const imageData = ctx.getImageData(0, 0, w, h);
      const data = imageData.data;
      const strength = (val / 100) * 120;
      for (let i = 0; i < data.length; i += 4) {
        const noise = (Math.random() - 0.5) * strength;
        data[i] += noise; data[i+1] += noise; data[i+2] += noise;
      }
      ctx.putImageData(imageData, 0, 0);
    }
  },

  // ==========================================
  // 2. LIGHT & COLOR (The Optical Layer)
  // ==========================================

  washed: {
    name: 'Washed Out',
    min: 0, max: 100, step: 1, unit: '%',
    apply: (ctx, val, w, h) => {
      if (val <= 0) return;
      
      const imageData = ctx.getImageData(0, 0, w, h);
      const data = imageData.data;
      const amount = val / 100;

      const freq = 0.005; 
      const amp = 0.25;    
      
      const driftX = Math.sin(val * 0.05) * 200; 
      const driftY = Math.cos(val * 0.05) * 200; 

      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const i = (y * w + x) * 4;
          
          const wobble = Math.sin((y + driftY) * freq) * amp + 
                         Math.cos((x + driftX) * freq) * amp;
          
          let gradPos = (x / w + y / h) / 2 + wobble;
          gradPos = Math.max(0, Math.min(1, gradPos));

          const shift = (gradPos - 0.5) * 2 * amount; 

          let r = data[i], g = data[i+1], b = data[i+2];
          const gray = (r + g + b) / 3;

          if (shift < 0) {
            const angle = Math.abs(shift) * Math.PI * 0.6; 
            const cosA = Math.cos(angle), sinA = Math.sin(angle);

            data[i]   = (0.213 + cosA * 0.787 - sinA * 0.213) * r + 
                         (0.715 - cosA * 0.715 - sinA * 0.715) * g + 
                         (0.072 - cosA * 0.072 + sinA * 0.928) * b;

            data[i+1] = (0.213 - cosA * 0.213 + sinA * 0.143) * r + 
                         (0.715 + cosA * 0.285 + sinA * 0.140) * g + 
                         (0.072 - cosA * 0.072 - sinA * 0.283) * b;

            data[i+2] = (0.213 - cosA * 0.213 - sinA * 0.787) * r + 
                         (0.715 - cosA * 0.715 + sinA * 0.715) * g + 
                         (0.072 + cosA * 0.928 + sinA * 0.072) * b;
            
            const darken = 1 - Math.abs(shift) * 0.25;
            data[i] *= darken; data[i+1] *= darken; data[i+2] *= darken;
          } else {
            const desat = Math.min(1, shift * 1.5); 
            data[i]   = r * (1 - desat) + gray * desat;
            data[i+1] = g * (1 - desat) + gray * desat;
            data[i+2] = b * (1 - desat) + gray * desat;

            const lift = shift * 160;
            data[i]   += lift; 
            data[i+1] += lift * 0.95; 
            data[i+2] += lift * 0.85; 
          }

          data[i] = Math.min(255, Math.max(0, data[i]));
          data[i+1] = Math.min(255, Math.max(0, data[i+1]));
          data[i+2] = Math.min(255, Math.max(0, data[i+2]));
        }
      }
      ctx.putImageData(imageData, 0, 0);
    }
  },

  vignette: {
    name: 'Lens Vignette',
    min: 0, max: 100, step: 1, unit: '%',
    apply: (ctx, val, w, h) => {
      if (val <= 0) return;
      const imageData = ctx.getImageData(0, 0, w, h);
      const data = imageData.data;
      const intensity = val / 100;
      
      const cx = w / 2;
      const cy = h / 2;
      const maxDist = Math.sqrt(cx * cx + cy * cy);

      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const dx = x - cx;
          const dy = y - cy;
          const dist = Math.sqrt(dx * dx + dy * dy);
          
          const falloff = Math.pow(dist / maxDist, 1.5) * intensity;
          
          const i = (y * w + x) * 4;
          data[i] *= (1 - falloff);
          data[i+1] *= (1 - falloff);
          data[i+2] *= (1 - falloff);
        }
      }
      ctx.putImageData(imageData, 0, 0);
    }
  },

  chromatic: {
    name: 'Color Shift',
    min: 0, max: 30, step: 1, unit: 'px',
    apply: (ctx, val, w, h) => {
      if (val === 0) return;
      const imageData = ctx.getImageData(0, 0, w, h);
      const original = new Uint8ClampedArray(imageData.data);
      const data = imageData.data;
      
      const shift = val * 4;
      
      for (let i = 0; i < data.length; i += 4) {
        if (i + shift < data.length) {
          data[i] = original[i + shift]; 
        }
        if (i + 2 - shift >= 0) {
          data[i + 2] = original[i + 2 - shift]; 
        }
      }
      ctx.putImageData(imageData, 0, 0);
    }
  },

  // ==========================================
  // 3. GLITCH & MECHANICAL (The Damage Layer)
  // ==========================================

  scannerPull: {
    name: 'Scanner Pull',
    min: 0, max: 100, step: 1, unit: '%',
    apply: (ctx, val, w, h) => {
      if (val <= 0) return;
      
      const startOffsetPercent = 0.1 + ((Math.sin(val * 0.3) + 1) / 2) * 0.6;
      const pullStartY = Math.floor(h * startOffsetPercent); 
      
      const dragDistance = Math.floor((val / 100) * (h - pullStartY));
      const scanline = ctx.getImageData(0, pullStartY, w, 2);
      
      let mechanicalY = pullStartY;
      
      for (let i = 0; i < dragDistance; i++) {
        let slipX = Math.sin(i * 0.05) * (val * 0.3);
        
        if (Math.random() < 0.1) {
          slipX += (Math.random() - 0.5) * val;
        }
        
        if (Math.random() < 0.05) {
          mechanicalY += Math.floor((Math.random() - 0.2) * 15);
        } else {
          mechanicalY++; 
        }
        
        if (mechanicalY >= h) break;
        ctx.putImageData(scanline, Math.floor(slipX), Math.floor(mechanicalY));
      }
    }
  },

  slitscan: {
    name: 'Temporal Slitscan',
    min: 0, max: 100, step: 1, unit: '%',
    apply: (ctx, val, w, h) => {
      if (val <= 0) return;
      const imageData = ctx.getImageData(0, 0, w, h);
      const original = new Uint8ClampedArray(imageData.data);
      const data = imageData.data;

      const waveStrength = val / 100;

      for (let y = 0; y < h; y++) {
        let sourceY = y + Math.sin(y * 0.01) * (waveStrength * 100);
        let xOffset = Math.cos(y * 0.02) * (waveStrength * 20);

        sourceY = Math.max(0, Math.min(h - 1, Math.floor(sourceY)));

        for (let x = 0; x < w; x++) {
          const targetIdx = (y * w + x) * 4;
          let sourceX = Math.floor(x + xOffset) % w;
          if (sourceX < 0) sourceX += w;

          const sourceIdx = (sourceY * w + sourceX) * 4;

          data[targetIdx]     = original[sourceIdx];
          data[targetIdx + 1] = original[sourceIdx + 1];
          data[targetIdx + 2] = original[sourceIdx + 2];
          data[targetIdx + 3] = original[sourceIdx + 3];
        }
      }
      ctx.putImageData(imageData, 0, 0);
    }
  },

  smear: {
    name: 'Smear',
    min: 0, max: 100, step: 1, unit: '%',
    apply: (ctx, val, w, h) => {
      if (val <= 0) return;
      const imageData = ctx.getImageData(0, 0, w, h);
      const original = new Uint8ClampedArray(imageData.data);
      const data = imageData.data;

      const numGlitches = Math.floor((val / 100) * 80);

      for(let i = 0; i < numGlitches; i++) {
        const sx = Math.floor(Math.random() * w);
        const sy = Math.floor(Math.random() * h);
        const bSize = Math.floor(Math.random() * 30) + 10; 

        const block = [];
        for(let by = 0; by < bSize; by++) {
          block[by] = [];
          for(let bx = 0; bx < bSize; bx++) {
            const py = (sy + by) % h;
            const px = (sx + bx) % w;
            const idx = (py * w + px) * 4;
            block[by][bx] = [original[idx], original[idx+1], original[idx+2], original[idx+3]];
          }
        }

        const axis = Math.random() < 0.5 ? 'x' : 'y';
        const dir = Math.random() < 0.5 ? 1 : -1;
        const length = Math.floor(Math.random() * (w * 0.4)) + 50; 

        for(let step = 0; step < length; step++) {
          const cx = axis === 'x' ? sx + (step * dir) : sx;
          const cy = axis === 'y' ? sy + (step * dir) : sy;

          for(let by = 0; by < bSize; by++) {
            for(let bx = 0; bx < bSize; bx++) {
              const py = cy + by;
              const px = cx + bx;
              if (px >= 0 && px < w && py >= 0 && py < h) {
                const idx = (py * w + px) * 4;
                const col = block[by][bx];
                data[idx] = col[0];
                data[idx+1] = col[1];
                data[idx+2] = col[2];
                data[idx+3] = col[3];
              }
            }
          }
        }
      }
      ctx.putImageData(imageData, 0, 0);
    }
  },

  glitch: {
    name: 'Scanline Glitch',
    min: 0, max: 100, step: 1, unit: '%',
    apply: (ctx, val, w, h) => {
      if (val === 0) return;
      const amount = Math.floor((val / 100) * (h / 10)); 
      for (let i = 0; i < amount; i++) {
        const y = Math.floor(Math.random() * h);
        const height = Math.floor(Math.random() * 10) + 2;
        const shift = Math.floor((Math.random() - 0.5) * (val * 2));
        
        const slice = ctx.getImageData(0, y, w, height);
        ctx.putImageData(slice, shift, y);
      }
    }
  },

  wavy: {
    name: 'Wavy Shift',
    min: 0, max: 100, step: 1, unit: '%',
    apply: (ctx, val, w, h) => {
      if (val <= 0) return;
      const imageData = ctx.getImageData(0, 0, w, h);
      const original = new Uint8ClampedArray(imageData.data);
      const data = imageData.data;
      const amplitude = (val / 100) * (w * 0.15); 
      const frequency = 0.005; 

      for (let y = 0; y < h; y++) {
        const xOffset = Math.floor(Math.sin(y * frequency + (val * 0.05)) * amplitude);
        for (let x = 0; x < w; x++) {
          const targetIdx = (y * w + x) * 4;
          let sourceX = (x + xOffset) % w;
          if (sourceX < 0) sourceX += w;
          const sourceIdx = (y * w + sourceX) * 4;
          data[targetIdx] = original[sourceIdx];
          data[targetIdx+1] = original[sourceIdx+1];
          data[targetIdx+2] = original[sourceIdx+2];
          data[targetIdx+3] = original[sourceIdx+3];
        }
      }
      ctx.putImageData(imageData, 0, 0);
    }
  },

  // ==========================================
  // 4. FORM & GEOMETRY (The Digital Layer)
  // ==========================================

  pixelate: {
    name: 'Pixelate',
    min: 2, max: 40, step: 1, unit: 'px',
    apply: (ctx, val, w, h) => {
      if (val <= 1) return;
      const imageData = ctx.getImageData(0, 0, w, h);
      const data = imageData.data;
      const size = Math.floor(val);

      for (let y = 0; y < h; y += size) {
        for (let x = 0; x < w; x += size) {
          const i = (y * w + x) * 4;
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];

          ctx.fillStyle = `rgb(${r},${g},${b})`;
          ctx.fillRect(x, y, size, size);
        }
      }
    }
  },

  ascii: {
    name: 'ASCII Overwrite',
    min: 10, max: 60, step: 2, unit: 'px',
    apply: (ctx, val, w, h) => {
      const size = Math.max(10, parseInt(val, 10)); 
      if (isNaN(size)) return;

      const imageData = ctx.getImageData(0, 0, w, h);
      const data = imageData.data;
      
      ctx.fillStyle = appState.bgColor;
      ctx.fillRect(0, 0, w, h);
      
      const chars = "@%#*+=-:. "; 
      
      ctx.font = `bold ${size}px monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      for (let y = size / 2; y < h; y += size) {
        for (let x = size / 2; x < w; x += size) {
          const i = (Math.floor(y) * w + Math.floor(x)) * 4;
          
          if (data[i + 3] === 0) continue; 

          const r = data[i], g = data[i + 1], b = data[i + 2];
          const lum = (0.299 * r + 0.587 * g + 0.114 * b);
          
          const charIdx = Math.floor((lum / 255) * (chars.length - 1));
          
          ctx.fillStyle = `rgb(${r},${g},${b})`;
          ctx.fillText(chars[charIdx], x, y);
        }
      }
    }
  },

  kaleidoscope: {
    name: 'Kaleidoscope',
    min: 2, max: 24, step: 2, unit: 'x',
    apply: (ctx, val, w, h) => {
      const segments = Math.max(2, parseInt(val, 10));
      if (isNaN(segments)) return;

      const offCanvas = document.createElement('canvas');
      offCanvas.width = w;
      offCanvas.height = h;
      const offCtx = offCanvas.getContext('2d');
      offCtx.putImageData(ctx.getImageData(0, 0, w, h), 0, 0);

      ctx.fillStyle = appState.bgColor;
      ctx.fillRect(0, 0, w, h);

      const cx = w / 2;
      const cy = h / 2;
      const radius = Math.sqrt(cx * cx + cy * cy);
      const angle = (Math.PI * 2) / segments;

      for (let i = 0; i < segments; i++) {
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(i * angle);

        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, radius, -0.005, angle + 0.005);
        ctx.lineTo(0, 0);
        ctx.clip();

        if (i % 2 === 1) {
          ctx.rotate(angle / 2);
          ctx.scale(1, -1);
          ctx.rotate(-angle / 2);
        }

        ctx.drawImage(offCanvas, -cx, -cy);
        ctx.restore();
      }
    }
  }

};