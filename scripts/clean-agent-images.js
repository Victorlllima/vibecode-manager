const sharp = require('sharp')
const path = require('path')
const fs = require('fs')

const AGENTS_DIR = path.join(__dirname, '..', 'public', 'agents')

function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  let h, s, l = (max + min) / 2
  if (max === min) {
    h = s = 0
  } else {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break
      case g: h = ((b - r) / d + 2) / 6; break
      case b: h = ((r - g) / d + 4) / 6; break
    }
  }
  return { h: h * 360, s: s * 100, l: l * 100 }
}

// ========================================================================
// v9 - Combines best of v7 (safe thresholds) + v8 (eye protection)
//
// Key: v7 thresholds for non-neon (0.60) to protect robot body,
// but use v8's approach for neon pixels (0.35) and eye zones.
// Additional: 6 passes (not 8) with FIXED thresholds (not progressively
// lower) to avoid erosion of robot edges.
// ========================================================================

const agentConfigs = {
  'shiva.png': {
    name: 'Shiva',
    textRegionMaxY: 0.38,
    floodThreshold: 12,
    isNeonColor: (r, g, b, hsl) => {
      return (hsl.h >= 170 && hsl.h <= 270 && hsl.s > 20 && b > 20)
    },
    eyeZones: [
      { cx: 0.415, cy: 0.255, r: 0.050 },
      { cx: 0.575, cy: 0.255, r: 0.050 },
    ]
  },
  'hades.png': {
    name: 'Hades',
    textRegionMaxY: 0.28,
    floodThreshold: 12,
    isNeonColor: (r, g, b, hsl) => {
      return (hsl.h >= 170 && hsl.h <= 270 && hsl.s > 20 && b > 20)
    },
    eyeZones: [
      { cx: 0.395, cy: 0.225, r: 0.045 },
      { cx: 0.565, cy: 0.225, r: 0.045 },
    ]
  },
  'atlas.png': {
    name: 'Atlas',
    textRegionMaxY: 0.52,
    floodThreshold: 10,
    isNeonColor: (r, g, b, hsl) => {
      return (hsl.h >= 170 && hsl.h <= 260 && hsl.s > 25 && b > 20)
    },
    eyeZones: [
      { cx: 0.47, cy: 0.225, r: 0.06 },
    ]
  },
  'ravena.png': {
    name: 'Ravena',
    textRegionMaxY: 0.28,
    floodThreshold: 12,
    isNeonColor: (r, g, b, hsl) => {
      return (hsl.h >= 170 && hsl.h <= 270 && hsl.s > 20 && b > 20)
    },
    eyeZones: [
      { cx: 0.385, cy: 0.215, r: 0.050 },
      { cx: 0.535, cy: 0.215, r: 0.050 },
      { cx: 0.255, cy: 0.175, r: 0.040 },
      { cx: 0.665, cy: 0.185, r: 0.040 },
    ]
  },
  'kerberos.png': {
    name: 'Kerberos',
    textRegionMaxY: 0.25,
    floodThreshold: 4,
    isNeonColor: (r, g, b, hsl) => {
      return (hsl.h >= 240 && hsl.h <= 340 && hsl.s > 15 && (r + b) > 35)
    },
    eyeZones: []
  }
}

function isInEyeZone(x, y, width, height, zones) {
  if (!zones || zones.length === 0) return false
  const xr = x / width, yr = y / height
  for (const z of zones) {
    const dx = xr - z.cx, dy = yr - z.cy
    if (Math.sqrt(dx * dx + dy * dy) < z.r) return true
  }
  return false
}

function blackNeighborRatio(pixels, x, y, width, height, ch, radius) {
  let blackCount = 0, total = 0
  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius; dx <= radius; dx++) {
      if (dx === 0 && dy === 0) continue
      const nx = x + dx, ny = y + dy
      if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue
      total++
      const idx = (ny * width + nx) * ch
      if (pixels[idx] <= 10 && pixels[idx + 1] <= 10 && pixels[idx + 2] <= 10) {
        blackCount++
      }
    }
  }
  return total > 0 ? blackCount / total : 0
}

async function cleanImage(filename) {
  const config = agentConfigs[filename]
  if (!config) return

  const originalPath = path.join(AGENTS_DIR, filename.replace('.png', '.original.png'))
  const outputPath = path.join(AGENTS_DIR, filename)

  if (!fs.existsSync(originalPath)) {
    fs.copyFileSync(outputPath, originalPath)
  }

  const metadata = await sharp(originalPath).metadata()
  const { width, height } = metadata
  console.log(`Processing ${config.name} (${width}x${height})...`)

  const rawBuffer = await sharp(originalPath).ensureAlpha().raw().toBuffer()
  const pixels = Buffer.from(rawBuffer)
  const ch = 4
  const threshold = config.floodThreshold
  const textMaxPx = Math.floor(height * config.textRegionMaxY)

  // PHASE 1: Flood fill
  console.log(`  Phase 1: Flood fill (threshold=${threshold})...`)
  const robotMask = new Uint8Array(width * height)
  const visited = new Uint8Array(width * height)
  const queue = []

  for (let y = Math.floor(height * 0.55); y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * ch
      const brightness = Math.max(pixels[idx], pixels[idx + 1], pixels[idx + 2])
      if (brightness > threshold) {
        const pos = y * width + x
        robotMask[pos] = 1; visited[pos] = 1; queue.push(pos)
      }
    }
  }

  let head = 0
  while (head < queue.length) {
    const pos = queue[head++]
    const py = Math.floor(pos / width), px = pos % width
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue
        const nx = px + dx, ny = py + dy
        if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue
        const np = ny * width + nx
        if (visited[np]) continue
        visited[np] = 1
        const nidx = np * ch
        const brightness = Math.max(pixels[nidx], pixels[nidx + 1], pixels[nidx + 2])
        if (brightness > threshold) {
          robotMask[np] = 1; queue.push(np)
        }
      }
    }
  }

  // PHASE 2: Remove disconnected
  let phase2 = 0
  for (let y = 0; y < textMaxPx; y++) {
    for (let x = 0; x < width; x++) {
      const pos = y * width + x
      if (robotMask[pos]) continue
      const idx = pos * ch
      if (pixels[idx] <= 5 && pixels[idx + 1] <= 5 && pixels[idx + 2] <= 5) continue
      pixels[idx] = 0; pixels[idx + 1] = 0; pixels[idx + 2] = 0
      phase2++
    }
  }
  console.log(`  Phase 2: Removed ${phase2} disconnected`)

  // PHASE 3: Density-based removal with FIXED thresholds + eye protection
  // Use STABLE thresholds across all passes (no progressive erosion)
  console.log('  Phase 3: Density removal (stable thresholds)...')
  let totalPhase3 = 0

  const NEON_BNR_SMALL = 0.35  // Safe for neon on thin background
  const NEON_BNR_LARGE = 0.45
  const GRAY_BNR_SMALL = 0.60  // High = only very thin structures removed
  const GRAY_BNR_LARGE = 0.55

  for (let pass = 0; pass < 6; pass++) {
    let passRemoved = 0

    for (let y = 0; y < textMaxPx; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * ch
        const r = pixels[idx], g = pixels[idx + 1], b = pixels[idx + 2]
        if (r <= 5 && g <= 5 && b <= 5) continue

        // PROTECT eye zones
        if (isInEyeZone(x, y, width, height, config.eyeZones)) continue

        const hsl = rgbToHsl(r, g, b)
        const isNeon = config.isNeonColor(r, g, b, hsl)

        const bnr3 = blackNeighborRatio(pixels, x, y, width, height, ch, 3)
        const bnr6 = blackNeighborRatio(pixels, x, y, width, height, ch, 6)

        let shouldRemove = false

        if (isNeon) {
          if (bnr3 > NEON_BNR_SMALL || bnr6 > NEON_BNR_LARGE) {
            shouldRemove = true
          }
          // Very dim glow always remove
          if (hsl.l < 12 && hsl.s > 20) {
            shouldRemove = true
          }
        } else {
          // Only remove very thin gray structures
          if (bnr3 > GRAY_BNR_SMALL && bnr6 > GRAY_BNR_LARGE) {
            shouldRemove = true
          }
        }

        if (shouldRemove) {
          pixels[idx] = 0; pixels[idx + 1] = 0; pixels[idx + 2] = 0
          passRemoved++
        }
      }
    }

    totalPhase3 += passRemoved
    console.log(`    Pass ${pass + 1}: ${passRemoved}`)
    if (passRemoved < 50) break
  }
  console.log(`  Phase 3 total: ${totalPhase3}`)

  // PHASE 4: Orphan cleanup
  console.log('  Phase 4: Orphan cleanup...')
  const robotMask2 = new Uint8Array(width * height)
  const visited2 = new Uint8Array(width * height)
  const queue2 = []

  for (let y = Math.floor(height * 0.50); y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * ch
      if (pixels[idx] > 3 || pixels[idx + 1] > 3 || pixels[idx + 2] > 3) {
        const pos = y * width + x
        robotMask2[pos] = 1; visited2[pos] = 1; queue2.push(pos)
      }
    }
  }

  head = 0
  while (head < queue2.length) {
    const pos = queue2[head++]
    const py = Math.floor(pos / width), px = pos % width
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue
        const nx = px + dx, ny = py + dy
        if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue
        const np = ny * width + nx
        if (visited2[np]) continue
        visited2[np] = 1
        const nidx = np * ch
        if (pixels[nidx] > 3 || pixels[nidx + 1] > 3 || pixels[nidx + 2] > 3) {
          robotMask2[np] = 1; queue2.push(np)
        }
      }
    }
  }

  let phase4 = 0
  for (let y = 0; y < textMaxPx; y++) {
    for (let x = 0; x < width; x++) {
      const pos = y * width + x
      const idx = pos * ch
      if (pixels[idx] <= 3 && pixels[idx + 1] <= 3 && pixels[idx + 2] <= 3) continue
      if (!robotMask2[pos]) {
        if (isInEyeZone(x, y, width, height, config.eyeZones)) continue
        pixels[idx] = 0; pixels[idx + 1] = 0; pixels[idx + 2] = 0
        phase4++
      }
    }
  }
  console.log(`  Phase 4: ${phase4} orphans`)

  console.log(`  TOTAL: ${phase2 + totalPhase3 + phase4}`)

  const tempPath = outputPath + '.tmp.png'
  await sharp(pixels, { raw: { width, height, channels: ch } })
    .png()
    .toFile(tempPath)
  fs.copyFileSync(tempPath, outputPath)
  fs.unlinkSync(tempPath)
  console.log(`  Saved: ${filename}\n`)
}

async function main() {
  console.log('=== S.H.A.R.K. Agent Image Cleaner v9 ===\n')
  const files = ['shiva.png', 'hades.png', 'atlas.png', 'ravena.png', 'kerberos.png']
  for (const f of files) {
    const origPath = path.join(AGENTS_DIR, f.replace('.png', '.original.png'))
    const curPath = path.join(AGENTS_DIR, f)
    if (!fs.existsSync(curPath) && !fs.existsSync(origPath)) {
      console.log(`${f} not found\n`); continue
    }
    await cleanImage(f)
  }
  console.log('All done!')
}

main().catch(err => { console.error('FATAL:', err); process.exit(1) })
