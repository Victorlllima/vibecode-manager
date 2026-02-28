/**
 * clean-agent-images-v2.js — FINAL VERSION v4
 * Uses originals. Per-image strategies:
 * - Hades: geometric zones with blue-text-aware body detection
 * - Atlas: color-based blue/cyan removal
 * - Shiva: multi-pass (flood-fill + color + density-based outline removal)
 */

const sharp = require('c:/Users/victo_htyd3kj/OneDrive/Desktop/Projetos/Vibecoding/vibecode-manager/node_modules/sharp');
const path = require('path');
const fs = require('fs');

const AGENTS_DIR = 'c:/Users/victo_htyd3kj/OneDrive/Desktop/Projetos/Vibecoding/vibecode-manager/public/agents';

// ===================== HADES =====================
async function cleanHades() {
  console.log('\n=== CLEANING HADES ===');
  const raw = await loadRaw('hades.original.png');
  let cleaned = 0;

  // ZONE A: y < 14% — nuke all
  const zoneAEnd = Math.floor(raw.height * 0.14);
  for (let y = 0; y < zoneAEnd; y++) {
    for (let x = 0; x < raw.width; x++) {
      if (getBr(raw, x, y) > 10) { setBlack(raw, x, y); cleaned++; }
    }
  }

  // ZONE B: y 14-19% — keep only solid yellow runs (helmet)
  const zoneBEnd = Math.floor(raw.height * 0.19);
  for (let y = zoneAEnd; y < zoneBEnd; y++) {
    const bodyRuns = findHadesBodyRuns(raw, y, 40, 15);
    for (let x = 0; x < raw.width; x++) {
      if (!isInRuns(x, bodyRuns, 10) && getBr(raw, x, y) > 10) {
        setBlack(raw, x, y); cleaned++;
      }
    }
  }

  // ZONE C: y 19-40% — clean far sides only
  for (let y = zoneBEnd; y < Math.floor(raw.height * 0.40); y++) {
    let [left, right] = findBodyExtent(raw, y, 40);
    if (left >= right) continue;
    for (let x = 0; x < Math.max(0, left - 20); x++) {
      if (getBr(raw, x, y) > 10) { setBlack(raw, x, y); cleaned++; }
    }
    for (let x = Math.min(raw.width, right + 20); x < raw.width; x++) {
      if (getBr(raw, x, y) > 10) { setBlack(raw, x, y); cleaned++; }
    }
  }

  console.log(`  Cleaned ${cleaned} pixels`);
  await saveImage(raw, 'hades.png');
}

// ===================== ATLAS =====================
async function cleanAtlas() {
  console.log('\n=== CLEANING ATLAS ===');
  const raw = await loadRaw('atlas.original.png');
  let cleaned = 0;

  const cx = raw.width / 2;
  const yStart = Math.floor(raw.height * 0.16);
  const yEnd = Math.floor(raw.height * 0.55);
  const visorYS = Math.floor(raw.height * 0.23);
  const visorYE = Math.floor(raw.height * 0.35);
  const visorXR = raw.width * 0.18;

  for (let y = yStart; y < yEnd; y++) {
    for (let x = 0; x < raw.width; x++) {
      const [r, g, b] = getRGB(raw, x, y);
      const br = r + g + b;
      if (br < 10) continue;

      const isBlue = b > r + 3 && b > 15;
      const isCyan = b > 15 && g > 10 && b > r * 1.1 && g > r;
      const isDarkBl = b >= r && b >= g && (b - r >= 2) && br > 8 && br < 100;
      if (!(isBlue || isCyan || isDarkBl)) continue;

      if (y >= visorYS && y <= visorYE && Math.abs(x - cx) < visorXR) continue;
      const range = Math.max(r,g,b) - Math.min(r,g,b);
      if (range < 6 && br > 60) continue;

      setBlack(raw, x, y); cleaned++;
    }
  }

  // Clean sides
  for (let y = Math.floor(raw.height * 0.24); y < Math.floor(raw.height * 0.52); y++) {
    for (let x = 0; x < raw.width; x++) {
      if (Math.abs(x - cx) < raw.width * 0.24) continue;
      if (getBr(raw, x, y) > 8) { setBlack(raw, x, y); cleaned++; }
    }
  }

  console.log(`  Cleaned ${cleaned} pixels`);
  await saveImage(raw, 'atlas.png');
}

// ===================== SHIVA =====================
async function cleanShiva() {
  console.log('\n=== CLEANING SHIVA ===');
  const raw = await loadRaw('shiva.original.png');
  const W = raw.width;
  const H = raw.height;
  let totalCleaned = 0;

  const textRegionEnd = Math.floor(H * 0.26);

  // ---- PASS 1: Remove all blue/cyan text fill (color-based) ----
  // Build a removal mask FIRST using original pixel data, then apply it.
  // This avoids the issue of neighbor checks seeing already-cleaned pixels.
  let pass1 = 0;

  // Eye protection zone (precise from analysis)
  const eyeZone = {
    xMin: Math.floor(W * 0.23), xMax: Math.floor(W * 0.35),
    yMin: Math.floor(H * 0.14), yMax: Math.floor(H * 0.20)
  };

  // Pre-compute brightness map for neighbor checks (frozen snapshot)
  const brMap = new Uint16Array(W * textRegionEnd);
  for (let y = 0; y < textRegionEnd; y++) {
    for (let x = 0; x < W; x++) {
      brMap[y * W + x] = getBr(raw, x, y);
    }
  }
  // Helper: get brightness from frozen map
  function origBr(x, y) {
    if (y < 0 || y >= textRegionEnd || x < 0 || x >= W) return getBr(raw, x, y);
    return brMap[y * W + x];
  }

  const removeMask = new Uint8Array(W * textRegionEnd); // 1 = remove

  for (let y = 0; y < textRegionEnd; y++) {
    for (let x = 0; x < W; x++) {
      const [r, g, b] = getRGB(raw, x, y);
      const br = r + g + b;
      if (br < 5) continue;

      // Blue text: strong blue channel, low red
      const isBlue = b > 25 && b > r * 1.3 && r < 70;
      // Cyan glow: both blue and green high, red low
      const isCyan = b > 60 && g > 50 && b > r * 1.3 && r < 80;
      // Bright cyan glow
      const isBrightCyan = b > 150 && g > 150 && b > r * 1.5 && r < 150;
      // Medium cyan: B-R > 25, protect head by checking white neighbors
      let isMedCyan = false;
      if (b > 100 && g > 80 && (b - r) > 25 && r < 210) {
        let whiteN = 0;
        for (const [ddx, ddy] of [[-6,0],[6,0],[0,-6],[0,6],[-6,-6],[6,-6],[-6,6],[6,6]]) {
          const nx = x + ddx, ny = y + ddy;
          if (nx < 0 || nx >= W || ny < 0 || ny >= H) continue;
          if (origBr(nx, ny) > 500) whiteN++;
        }
        isMedCyan = whiteN < 3;
      }

      if (!(isBlue || isCyan || isBrightCyan || isMedCyan)) continue;

      // Protect eyes
      if (x >= eyeZone.xMin && x <= eyeZone.xMax &&
          y >= eyeZone.yMin && y <= eyeZone.yMax) continue;

      // Protect blue body accents (below head, near white body pixels)
      if (y > Math.floor(H * 0.21)) {
        let bodyNear = 0;
        for (const [dx, dy] of [[-4,0],[4,0],[0,-4],[0,4]]) {
          const nx = x + dx, ny = y + dy;
          if (nx < 0 || nx >= W || ny < 0 || ny >= H) continue;
          if (origBr(nx, ny) > 250) bodyNear++;
        }
        if (bodyNear >= 2) continue;
      }

      removeMask[y * W + x] = 1;
    }
  }

  // Apply the mask
  for (let y = 0; y < textRegionEnd; y++) {
    for (let x = 0; x < W; x++) {
      if (removeMask[y * W + x] === 1) {
        setBlack(raw, x, y);
        pass1++;
      }
    }
  }
  console.log(`  Pass 1 (blue/cyan fill): removed ${pass1} pixels`);
  totalCleaned += pass1;

  // ---- PASS 1b: Iterative expansion from known text pixels ----
  // Any pixel adjacent to 2+ removed text pixels that has B > R is also text
  // Iterate until no more pixels are found
  let pass1b = 0;

  for (let iteration = 0; iteration < 10; iteration++) {
    let found = 0;
    const newRemove = [];

    for (let y = 0; y < textRegionEnd; y++) {
      for (let x = 0; x < W; x++) {
        if (removeMask[y * W + x] === 1) continue; // already removed

        const [r, g, b] = getRGB(raw, x, y);
        const br = r + g + b;
        if (br < 10) continue;

        // Must have some blue character (B > R)
        if (b <= r) continue;

        // Protect eyes
        if (x >= eyeZone.xMin && x <= eyeZone.xMax &&
            y >= eyeZone.yMin && y <= eyeZone.yMax) continue;

        // Count removed text pixel neighbors
        let textN = 0;
        for (const [dx, dy] of [[-2,0],[2,0],[0,-2],[0,2],[-2,-2],[2,-2],[-2,2],[2,2]]) {
          const nx = x + dx, ny = y + dy;
          if (nx < 0 || nx >= W || ny < 0 || ny >= textRegionEnd) continue;
          if (removeMask[ny * W + nx] === 1) textN++;
        }

        if (textN >= 2) {
          // Adjacent to multiple text pixels AND has blue tint = text
          // Extra protection for body accents
          if (y > Math.floor(H * 0.21)) {
            let bodyNear = 0;
            for (const [dx, dy] of [[-4,0],[4,0],[0,-4],[0,4]]) {
              const nx = x + dx, ny = y + dy;
              if (nx < 0 || nx >= W || ny < 0 || ny >= H) continue;
              if (origBr(nx, ny) > 350) bodyNear++;
            }
            if (bodyNear >= 2) continue;
          }
          newRemove.push(y * W + x);
          found++;
        }
      }
    }

    // Apply this iteration
    for (const idx of newRemove) {
      removeMask[idx] = 1;
      const y = Math.floor(idx / W);
      const x = idx % W;
      setBlack(raw, x, y);
    }
    pass1b += found;

    if (found === 0) break;
    console.log(`    Iteration ${iteration + 1}: expanded ${found} pixels`);
  }
  console.log(`  Pass 1b (iterative expansion): removed ${pass1b} pixels`);
  totalCleaned += pass1b;

  // ---- PASS 2: Remove dark text outlines using local density analysis ----
  // Text outlines are THIN dark lines (1-4px wide).
  // Body/chair are SOLID masses.
  // Key insight: a pixel that is part of a thin outline has few bright neighbors
  // in a local window, while a pixel on the body/chair edge has many.
  //
  // Strategy: For each pixel with br 5-80 in the text region,
  // count how many non-black pixels exist in a 7x7 window around it.
  // If the density is low (< 30%), it's a thin outline = text, remove it.
  // If the density is high (> 50%), it's on a solid body edge, keep it.

  let pass2 = 0;
  const densityRadius = 5; // check 11x11 window
  const densityThreshold = 0.30; // need at least 30% density to survive

  // Only process in text region, excluding the robot body core
  // The robot body is roughly centered at x=42%, the chair extends left
  // We process the ENTIRE top 26% but use density to distinguish

  for (let y = 0; y < textRegionEnd; y++) {
    for (let x = 0; x < W; x++) {
      const [r, g, b] = getRGB(raw, x, y);
      const br = r + g + b;

      // Only target dim pixels that could be text outlines
      if (br < 5 || br > 100) continue;

      // Skip if clearly part of a body (check color)
      // Body whites: br > 100 already excluded
      // Body dark parts: neutral gray or warm tones
      // Text outlines: slight blue tint OR neutral gray BUT thin

      // Count non-black neighbors in window
      let filled = 0;
      let total = 0;
      for (let dy = -densityRadius; dy <= densityRadius; dy++) {
        for (let dx = -densityRadius; dx <= densityRadius; dx++) {
          const nx = x + dx, ny = y + dy;
          if (nx < 0 || nx >= W || ny < 0 || ny >= H) continue;
          total++;
          if (getBr(raw, nx, ny) > 15) filled++;
        }
      }

      const density = filled / total;

      if (density < densityThreshold) {
        // Thin isolated feature = text outline, remove
        setBlack(raw, x, y);
        pass2++;
      }
    }
  }
  console.log(`  Pass 2 (density outline removal): removed ${pass2} pixels`);
  totalCleaned += pass2;

  // ---- PASS 3: Remove remaining text outline pixels that are dense but NOT connected to body below ----
  // Some text outlines are close to the chair and have high density because
  // the chair pixels inflate their density count.
  // Strategy: for pixels that survived density check BUT are in the upper part
  // of the image (y < 12%), be more aggressive — remove anything not pure black
  // in areas far from the robot head.

  let pass3 = 0;
  const headCX = W * 0.42;
  const headCY = H * 0.165;
  const headRX = W * 0.13;
  const headRY = H * 0.045; // tighter vertical radius — head top is at ~12%, not 10%
  const aggressiveY = Math.floor(H * 0.13); // top 13% (just above where head clearly starts)

  for (let y = 0; y < aggressiveY; y++) {
    for (let x = 0; x < W; x++) {
      const br = getBr(raw, x, y);
      if (br < 2) continue; // catch br=3 pixels (R=1,G=1,B=1 text outlines)

      // Check if inside head ellipse
      const dx = (x - headCX) / headRX;
      const dy = (y - headCY) / headRY;
      if (dx * dx + dy * dy < 1.0) continue; // tighter fit

      // Outside head in top 10% — nuke everything
      setBlack(raw, x, y);
      pass3++;
    }
  }
  console.log(`  Pass 3 (top 10% aggressive): removed ${pass3} pixels`);
  totalCleaned += pass3;

  // ---- PASS 4: Target remaining outlines between y=10% and y=20% outside head ----
  // These are pixels that survived the density check because they're near the chair.
  // Use a stricter density check with a LARGER window and also check color:
  // text outlines have a slight blue tint (B >= R), while chair is neutral gray.
  let pass4 = 0;
  const pass4YStart = Math.floor(H * 0.10);
  const pass4YEnd = Math.floor(H * 0.25);
  // Slightly larger head protection for pass 4 (preserve robot details)
  const p4HeadRX = W * 0.14;
  const p4HeadRY = H * 0.055;

  for (let y = pass4YStart; y < pass4YEnd; y++) {
    for (let x = 0; x < W; x++) {
      const [r, g, b] = getRGB(raw, x, y);
      const br = r + g + b;
      if (br < 2 || br > 80) continue;

      // Inside head? skip
      const hdx = (x - headCX) / p4HeadRX;
      const hdy = (y - headCY) / p4HeadRY;
      if (hdx * hdx + hdy * hdy < 1.2) continue;

      // Check if this pixel has a blue tint (text outline) vs neutral (chair)
      const hasBlue = b > r || b > g;

      if (hasBlue) {
        // Blue-tinted dim pixel outside head = text outline remnant
        setBlack(raw, x, y);
        pass4++;
      } else {
        // Neutral gray — could be chair or text. Use larger density window.
        let filled = 0, total = 0;
        const bigR = 10;
        for (let dy = -bigR; dy <= bigR; dy += 2) {
          for (let dx = -bigR; dx <= bigR; dx += 2) {
            const nx = x + dx, ny = y + dy;
            if (nx < 0 || nx >= W || ny < 0 || ny >= H) continue;
            total++;
            if (getBr(raw, nx, ny) > 30) filled++;
          }
        }
        if (filled / total < 0.35) {
          setBlack(raw, x, y);
          pass4++;
        }
      }
    }
  }
  console.log(`  Pass 4 (mid-zone blue-tint + density): removed ${pass4} pixels`);
  totalCleaned += pass4;

  console.log(`  Total cleaned: ${totalCleaned}`);
  await saveImage(raw, 'shiva.png');
}

// ===================== HELPERS =====================

async function loadRaw(filename) {
  const filePath = path.join(AGENTS_DIR, filename);
  const image = sharp(filePath);
  const meta = await image.metadata();
  const buffer = await image.raw().toBuffer();
  return { buffer, width: meta.width, height: meta.height, channels: meta.channels };
}

function getRGB(raw, x, y) {
  const idx = (y * raw.width + x) * raw.channels;
  return [raw.buffer[idx], raw.buffer[idx + 1], raw.buffer[idx + 2]];
}

function getBr(raw, x, y) {
  const idx = (y * raw.width + x) * raw.channels;
  return raw.buffer[idx] + raw.buffer[idx + 1] + raw.buffer[idx + 2];
}

function setBlack(raw, x, y) {
  const idx = (y * raw.width + x) * raw.channels;
  raw.buffer[idx] = 0;
  raw.buffer[idx + 1] = 0;
  raw.buffer[idx + 2] = 0;
}

async function saveImage(raw, filename) {
  const outPath = path.join(AGENTS_DIR, filename);
  await sharp(raw.buffer, { raw: { width: raw.width, height: raw.height, channels: raw.channels } })
    .png()
    .toFile(outPath + '.tmp');
  fs.renameSync(outPath + '.tmp', outPath);
  console.log(`  Saved ${filename}`);
}

function findHadesBodyRuns(raw, y, minLen, maxGap) {
  const runs = [];
  let runStart = -1, inRun = false, gap = 0;

  for (let x = 0; x < raw.width; x++) {
    const [r, g, b] = getRGB(raw, x, y);
    const br = r + g + b;
    const isYellow = (r > 120 && g > 80 && b < g * 0.8);
    const isHighlight = (r > 200 && g > 200 && b > 160);
    // Dark body: neutral or warm, NOT blue-tinted
    const isDarkBody = (br > 20 && br < 120 && r >= b - 2);
    const isBody = isYellow || isHighlight || isDarkBody;
    if (isBody) {
      if (!inRun) { runStart = x; inRun = true; }
      gap = 0;
    } else if (inRun) {
      gap++;
      if (gap > maxGap) {
        if ((x - gap) - runStart >= minLen) runs.push({ s: runStart, e: x - gap });
        inRun = false;
      }
    }
  }
  if (inRun) {
    const endX = raw.width - 1;
    if (endX - runStart >= minLen) runs.push({ s: runStart, e: endX });
  }

  // Merge close runs
  const merged = [];
  for (const run of runs) {
    if (merged.length > 0 && run.s - merged[merged.length - 1].e < 30) {
      merged[merged.length - 1].e = Math.max(merged[merged.length - 1].e, run.e);
    } else {
      merged.push({ ...run });
    }
  }
  return merged;
}

function isInRuns(x, runs, margin) {
  for (const r of runs) {
    if (x >= r.s - margin && x <= r.e + margin) return true;
  }
  return false;
}

function findBodyExtent(raw, y, threshold) {
  let left = raw.width, right = 0;
  for (let x = 0; x < raw.width; x++) {
    if (getBr(raw, x, y) > threshold) {
      if (x < left) left = x;
      if (x > right) right = x;
    }
  }
  return [left, right];
}

// ===================== MAIN =====================
async function main() {
  console.log('Agent Image Cleaner v2 — v4 (multi-pass Shiva)');
  console.log('===============================================');
  try {
    await cleanHades();
    await cleanAtlas();
    await cleanShiva();
    console.log('\nAll done!');
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

main();
