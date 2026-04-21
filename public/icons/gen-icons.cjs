#!/usr/bin/env node
// Q Icon Generator — pure Node.js, no dependencies
// generates icon-192.png and icon-512.png using raw PNG binary

const fs   = require('fs');
const path = require('path');
const zlib = require('zlib');

function createPNG(size) {
  const w = size, h = size;
  
  // Raw RGBA pixel data
  const raw = Buffer.alloc(w * h * 4);
  
  const cx = w / 2, cy = h / 2;
  const outerR = w * 0.42;
  const innerR = w * 0.12;
  
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const dx = x - cx, dy = y - cy;
      const dist = Math.sqrt(dx*dx + dy*dy);
      const angle = Math.atan2(dy, dx);
      
      // Background: dark navy radial
      const bgFactor = Math.min(1, dist / (w * 0.7));
      const bgR = Math.round(0 + bgFactor * 0);
      const bgG = Math.round(5 + bgFactor * 0);
      const bgB = Math.round(16 * (1 - bgFactor * 0.8));
      
      let r = bgR, g = bgG, b = bgB, a = 255;
      
      // Rounded rect mask (corner radius = 16% of size)
      const cornerR = w * 0.16;
      const inCorner = 
        (x < cornerR && y < cornerR && Math.sqrt((x-cornerR)**2+(y-cornerR)**2) > cornerR) ||
        (x > w-cornerR && y < cornerR && Math.sqrt((x-(w-cornerR))**2+(y-cornerR)**2) > cornerR) ||
        (x < cornerR && y > h-cornerR && Math.sqrt((x-cornerR)**2+(y-(h-cornerR))**2) > cornerR) ||
        (x > w-cornerR && y > h-cornerR && Math.sqrt((x-(w-cornerR))**2+(y-(h-cornerR))**2) > cornerR);
      
      if (inCorner) { raw[i]=0; raw[i+1]=0; raw[i+2]=0; raw[i+3]=0; continue; }
      
      // Core glow (radial gradient around center)
      if (dist < innerR * 1.8) {
        const glowStrength = Math.max(0, 1 - dist / (innerR * 1.8));
        g = Math.min(255, g + Math.round(80 * glowStrength));
        b = Math.min(255, b + Math.round(120 * glowStrength));
      }
      
      // Core circle fill
      if (dist < innerR) {
        r = 0; g = 17; b = 34;
      }
      
      // Core ring border
      if (dist >= innerR - w*0.005 && dist <= innerR + w*0.005) {
        r = 0; g = 230; b = 255;
        a = 200;
      }

      // Outer ring  
      if (dist >= outerR - w*0.003 && dist <= outerR + w*0.003) {
        r = 0; g = 200; b = 220;
        a = 60;
      }
      
      // Neural particles (dots on concentric rings at 36 angles)
      for (let j = 0; j < 36; j++) {
        const pAngle = (j / 36) * Math.PI * 2;
        const pR = outerR * (0.55 + ((j * 7919) % 100) / 100 * 0.35);
        const px = cx + Math.cos(pAngle) * pR;
        const py = cy + Math.sin(pAngle) * pR;
        const pd = Math.sqrt((x-px)**2+(y-py)**2);
        if (pd < w * 0.007) {
          r = 0; g = 242; b = 255;
          a = 200;
        }
      }

      // Q letter — approximate using pixel comparison (rasterized Q)
      // Simple approach: draw a ring + tail for Q shape
      const qR = innerR * 0.78;
      const qRing = Math.sqrt(dx*dx + dy*dy);
      if (qRing >= qR - w*0.012 && qRing <= qR + w*0.012) {
        r = 0; g = 242; b = 255;
        a = 230;
      }
      // Q tail
      if (dx > 0 && dy > -w*0.02 && dy < w*0.06 && 
          dx > qR*0.3 && dx < qR*0.85 &&
          qRing < qR + w*0.02) {
        r = 0; g = 242; b = 255;
        a = 230;
      }
      
      raw[i]   = r;
      raw[i+1] = g;
      raw[i+2] = b;
      raw[i+3] = a;
    }
  }
  
  // Swiss cross (bottom-right corner)
  const fSize = Math.round(w * 0.12);
  const fX    = Math.round(w * 0.84);
  const fY    = Math.round(h * 0.84);
  for (let fy = fY; fy < fY + fSize; fy++) {
    for (let fx = fX; fx < fX + fSize; fx++) {
      if (fy >= h || fx >= w) continue;
      const i = (fy * w + fx) * 4;
      const lx = fx - fX, ly = fy - fY;
      const arW = Math.round(fSize * 0.18), arL = fSize;
      const midX = (fSize - arW) / 2, midY = (fSize - arW) / 2;
      const inV = lx >= midX && lx < midX+arW;
      const inH = ly >= midY && ly < midY+arW;
      if (inV || inH) {
        raw[i]=255; raw[i+1]=255; raw[i+2]=255; raw[i+3]=230;
      } else {
        raw[i]=200; raw[i+1]=0; raw[i+2]=0; raw[i+3]=220;
      }
    }
  }
  
  return encodePNG(w, h, raw);
}

function encodePNG(w, h, rgba) {
  // PNG signature
  const sig = Buffer.from([137,80,78,71,13,10,26,10]);
  
  // IHDR chunk
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(w, 0);
  ihdrData.writeUInt32BE(h, 4);
  ihdrData[8] = 8;  // bit depth
  ihdrData[9] = 6;  // color type: RGBA
  ihdrData[10] = 0; ihdrData[11] = 0; ihdrData[12] = 0;
  const ihdr = makeChunk('IHDR', ihdrData);
  
  // IDAT chunk — filter + compress
  const scanlines = Buffer.alloc(h * (1 + w * 4));
  for (let y = 0; y < h; y++) {
    scanlines[y * (1 + w*4)] = 0; // None filter
    rgba.copy(scanlines, y*(1+w*4)+1, y*w*4, (y+1)*w*4);
  }
  const compressed = zlib.deflateSync(scanlines, { level: 6 });
  const idat = makeChunk('IDAT', compressed);
  
  // IEND chunk
  const iend = makeChunk('IEND', Buffer.alloc(0));
  
  return Buffer.concat([sig, ihdr, idat, iend]);
}

function makeChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeB = Buffer.from(type, 'ascii');
  const crcInput = Buffer.concat([typeB, data]);
  const crcVal = crc32(crcInput);
  const crcB = Buffer.alloc(4);
  crcB.writeUInt32BE(crcVal >>> 0, 0);
  return Buffer.concat([len, typeB, data, crcB]);
}

// CRC-32 implementation
function crc32(buf) {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i];
    for (let j = 0; j < 8; j++) {
      crc = (crc & 1) ? (0xEDB88320 ^ (crc >>> 1)) : (crc >>> 1);
    }
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

// Generate icons
const outDir = path.join(__dirname);

console.log('Generating 192x192...');
fs.writeFileSync(path.join(outDir, 'icon-192.png'), createPNG(192));
console.log('✓ icon-192.png');

console.log('Generating 512x512...');
fs.writeFileSync(path.join(outDir, 'icon-512.png'), createPNG(512));
console.log('✓ icon-512.png');

console.log('Done! Icons saved to', outDir);
