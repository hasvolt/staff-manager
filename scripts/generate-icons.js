import fs from 'fs';
import { encode } from 'fast-png';

function createIcon(size, isMaskable = false) {
  const width = size;
  const height = size;
  const data = new Uint8Array(width * height * 4);

  // Helper to blend a color at pixel (x, y) with alpha blending
  function blendPixel(x, y, r, g, b, a) {
    if (x < 0 || x >= width || y < 0 || y >= height || a <= 0) return;
    const idx = (Math.floor(y) * width + Math.floor(x)) * 4;
    const bgA = data[idx + 3] / 255;
    const srcA = Math.min(1, Math.max(0, a));
    const outA = srcA + bgA * (1 - srcA);
    if (outA <= 0) return;

    data[idx] = Math.round((r * srcA + data[idx] * bgA * (1 - srcA)) / outA);
    data[idx + 1] = Math.round((g * srcA + data[idx + 1] * bgA * (1 - srcA)) / outA);
    data[idx + 2] = Math.round((b * srcA + data[idx + 2] * bgA * (1 - srcA)) / outA);
    data[idx + 3] = Math.round(outA * 255);
  }

  // Draw anti-aliased filled circle
  function drawCircle(cx, cy, radius, r, g, b, alpha = 1) {
    const minX = Math.max(0, Math.floor(cx - radius - 1));
    const maxX = Math.min(width - 1, Math.ceil(cx + radius + 1));
    const minY = Math.max(0, Math.floor(cy - radius - 1));
    const maxY = Math.min(height - 1, Math.ceil(cy + radius + 1));

    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        const dist = Math.hypot(x - cx, y - cy);
        if (dist <= radius - 0.5) {
          blendPixel(x, y, r, g, b, alpha);
        } else if (dist < radius + 0.5) {
          const edgeA = (radius + 0.5 - dist) * alpha;
          blendPixel(x, y, r, g, b, edgeA);
        }
      }
    }
  }

  // Draw anti-aliased stroked line segment
  function drawLine(x1, y1, x2, y2, strokeWidth, r, g, b, alpha = 1) {
    const half = strokeWidth / 2;
    const minX = Math.max(0, Math.floor(Math.min(x1, x2) - strokeWidth));
    const maxX = Math.min(width - 1, Math.ceil(Math.max(x1, x2) + strokeWidth));
    const minY = Math.max(0, Math.floor(Math.min(y1, y2) - strokeWidth));
    const maxY = Math.min(height - 1, Math.ceil(Math.max(y1, y2) + strokeWidth));

    const dx = x2 - x1;
    const dy = y2 - y1;
    const lenSq = dx * dx + dy * dy;

    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        let t = 0;
        if (lenSq > 0) {
          t = Math.max(0, Math.min(1, ((x - x1) * dx + (y - y1) * dy) / lenSq));
        }
        const projX = x1 + t * dx;
        const projY = y1 + t * dy;
        const dist = Math.hypot(x - projX, y - projY);

        if (dist <= half - 0.5) {
          blendPixel(x, y, r, g, b, alpha);
        } else if (dist < half + 0.5) {
          const edgeA = (half + 0.5 - dist) * alpha;
          blendPixel(x, y, r, g, b, edgeA);
        }
      }
    }
  }

  // Draw rounded rectangle for base
  const cornerRadius = isMaskable ? 0 : width * 0.22;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      // Check rounded corner distance
      let inside = true;
      let alpha = 1;

      if (!isMaskable) {
        let dx = 0;
        let dy = 0;
        if (x < cornerRadius) dx = cornerRadius - x;
        else if (x > width - cornerRadius) dx = x - (width - cornerRadius);
        if (y < cornerRadius) dy = cornerRadius - y;
        else if (y > height - cornerRadius) dy = y - (height - cornerRadius);

        if (dx > 0 && dy > 0) {
          const dist = Math.hypot(dx, dy);
          if (dist > cornerRadius + 0.5) {
            inside = false;
          } else if (dist > cornerRadius - 0.5) {
            alpha = cornerRadius + 0.5 - dist;
          }
        }
      }

      if (inside) {
        // Gradient from top-left deep emerald to bottom-right obsidian
        const tY = y / height;
        const tX = x / width;
        const diag = (tX + tY) / 2;

        const r = Math.round(6 + (2 - 6) * diag);
        const g = Math.round(78 + (26 - 78) * diag);
        const b = Math.round(59 + (18 - 59) * diag);

        // subtle radial glow from upper-left
        const glowDist = Math.hypot(x - width * 0.25, y - height * 0.2) / width;
        const glow = Math.max(0, 1 - glowDist * 1.5) * 0.35;

        const finalR = Math.min(255, Math.round(r + 16 * glow));
        const finalG = Math.min(255, Math.round(g + 185 * glow));
        const finalB = Math.min(255, Math.round(b + 129 * glow));

        blendPixel(x, y, finalR, finalG, finalB, alpha);
      }
    }
  }

  // Draw 1px border stroke highlight if not maskable
  if (!isMaskable) {
    const strokeW = Math.max(1.5, width * 0.012);
    // Outer subtle border
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const edgeDist = Math.min(x, y, width - 1 - x, height - 1 - y);
        if (edgeDist < strokeW) {
          blendPixel(x, y, 52, 211, 153, 0.3);
        }
      }
    }
  }

  // Scale factor relative to 512 base design
  const s = (width / 512) * (isMaskable ? 0.78 : 0.94);
  const cx = width / 2;
  const cy = height / 2;
  const offX = cx - 256 * s;
  const offY = cy - 256 * s;

  // Left team member
  drawCircle(offX + 152 * s, offY + 186 * s, 40 * s, 52, 211, 153, 0.7);
  // Torso left
  for (let dy = 0; dy < 100 * s; dy += 1) {
    const curveW = (45 + dy * 0.5) * s;
    const py = offY + (255 + dy) * s;
    const px = offX + (152 - 35 + dy * 0.2) * s;
    drawCircle(px, py, curveW * 0.35, 30, 175, 120, 0.65);
  }

  // Right team member
  drawCircle(offX + 360 * s, offY + 186 * s, 40 * s, 52, 211, 153, 0.7);
  // Torso right
  for (let dy = 0; dy < 100 * s; dy += 1) {
    const curveW = (45 + dy * 0.5) * s;
    const py = offY + (255 + dy) * s;
    const px = offX + (360 + 35 - dy * 0.2) * s;
    drawCircle(px, py, curveW * 0.35, 30, 175, 120, 0.65);
  }

  // Center leader head
  drawCircle(offX + 256 * s, offY + 154 * s, 54 * s, 110, 231, 183, 1.0);

  // Center leader torso
  for (let dy = 0; dy < 125 * s; dy += 1) {
    const spread = (52 + dy * 0.85) * s;
    const py = offY + (240 + dy) * s;
    drawLine(offX + 256 * s - spread, py, offX + 256 * s + spread, py, 2 * s, 16, 185, 129, 0.95);
  }

  // Attendance badge
  const badgeCx = offX + 370 * s;
  const badgeCy = offY + 370 * s;
  const badgeR = 74 * s;

  // Outer shadow & background
  drawCircle(badgeCx, badgeCy + 4 * s, badgeR + 3 * s, 0, 0, 0, 0.45);
  drawCircle(badgeCx, badgeCy, badgeR, 3, 31, 21, 1.0);

  // Outer border ring
  for (let angle = 0; angle < Math.PI * 2; angle += 0.05) {
    const rx = badgeCx + Math.cos(angle) * (badgeR - 4 * s);
    const ry = badgeCy + Math.sin(angle) * (badgeR - 4 * s);
    drawCircle(rx, ry, 5 * s, 52, 211, 153, 0.95);
  }

  // Inner soft badge fill
  drawCircle(badgeCx, badgeCy, badgeR - 10 * s, 16, 185, 129, 0.25);

  // Crisp Checkmark
  const chkW = Math.max(2, 16 * s);
  drawLine(
    offX + 334 * s,
    offY + 370 * s,
    offX + 358 * s,
    offY + 396 * s,
    chkW,
    52,
    211,
    153,
    1.0
  );
  drawLine(
    offX + 358 * s,
    offY + 396 * s,
    offX + 410 * s,
    offY + 342 * s,
    chkW,
    52,
    211,
    153,
    1.0
  );

  return encode({ width, height, data });
}

// Generate all target files
console.log('Generating PWA and web icons...');

const pwa512 = createIcon(512, false);
fs.writeFileSync('public/pwa-512x512.png', Buffer.from(pwa512));
console.log('Wrote public/pwa-512x512.png');

const pwaMaskable = createIcon(512, true);
fs.writeFileSync('public/pwa-maskable-512x512.png', Buffer.from(pwaMaskable));
console.log('Wrote public/pwa-maskable-512x512.png');

const pwa192 = createIcon(192, false);
fs.writeFileSync('public/pwa-192x192.png', Buffer.from(pwa192));
console.log('Wrote public/pwa-192x192.png');

const appleTouch = createIcon(180, false);
fs.writeFileSync('public/apple-touch-icon.png', Buffer.from(appleTouch));
console.log('Wrote public/apple-touch-icon.png');

const faviconIco = createIcon(48, false);
fs.writeFileSync('public/favicon.ico', Buffer.from(faviconIco));
console.log('Wrote public/favicon.ico');

console.log('All icons generated successfully!');
