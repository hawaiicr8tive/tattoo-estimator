#!/usr/bin/env node
/*
 * crop-sharp.mjs — the SAME crop logic as crop-core.jsx, but done with `sharp`
 * (pure Node image library) instead of Photoshop. This is the engine that will
 * live inside the kiosk. Run it here FIRST to compare its output against the
 * Photoshop crops on the exact same buckets, before we wire it into the app.
 *
 * Like Photoshop, it ONLY crops + resizes — it never repaints a pixel, so the
 * artwork stays 100% untouched. Detection just decides the crop box.
 *
 * USE: put this folder (flash-cropper-sharp) INSIDE your flash-crop folder, then
 *      double-click run-sharp.command  (it installs sharp once, then crops).
 * It reads the existing crop-fills/ crop-margin/ textured/ buckets and writes a
 * squared-sharp/ subfolder in each — next to Photoshop's squared/ — for A/B.
 */

import sharp from 'sharp'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url))
const IMG_RE = /\.(jpe?g|png|tif|tiff|webp)$/i
const JOBS = [['crop-fills', 'fills'], ['crop-margin', 'margin'], ['textured', 'textured']]

// same knobs as crop-core.jsx
const MAX_EDGE = 1600, JPG_QUALITY = 92
const ZOOM_FILLS = 1.0, ZOOM_MARGIN = 0.82
const PAPER_THRESH = 180, ART_THRESH = 170, ART_FILL = 0.80, INSET = 0.015
const DETECT_W = 1400          // detect on a downscaled copy for speed
const NOISE_FRAC = 0.004       // ignore rows/cols with fewer hits than this (speck reject)

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, Math.round(v)))

async function resolveTarget() {
  if (process.argv[2]) return path.resolve(process.argv[2])
  for (const d of [SCRIPT_DIR, path.dirname(SCRIPT_DIR)]) {
    for (const [b] of JOBS) {
      try { await fs.access(path.join(d, b)); return d } catch {}
    }
  }
  return path.dirname(SCRIPT_DIR)
}

// greyscale + light denoise, downscaled; returns {data, w, h, scale} for a region
async function grayRaw(file, region) {
  let pipe = sharp(file, { failOn: 'none' }).removeAlpha().greyscale()
  if (region) pipe = pipe.extract({ left: region.x0, top: region.y0, width: region.x1 - region.x0, height: region.y1 - region.y0 })
  const regW = region ? region.x1 - region.x0 : null
  pipe = pipe.resize({ width: DETECT_W, fit: 'inside', withoutEnlargement: true }).median(3)
  const { data, info } = await pipe.raw().toBuffer({ resolveWithObject: true })
  const scale = region ? regW / info.width : null
  return { data, w: info.width, h: info.height, scale }
}

// bbox of qualifying pixels (bright = paper, dark = art), mapped back to full-res
async function detect(file, W, H, thresh, kind, region) {
  const reg = region || { x0: 0, y0: 0, x1: W, y1: H }
  const { data, w, h } = await grayRaw(file, reg)
  if (!w || !h) return null
  const rows = new Array(h).fill(0), cols = new Array(w).fill(0)
  for (let y = 0; y < h; y++) {
    const off = y * w
    for (let x = 0; x < w; x++) {
      const v = data[off + x]
      const hit = kind === 'bright' ? v >= thresh : v <= thresh
      if (hit) { rows[y]++; cols[x]++ }
    }
  }
  const needRow = Math.max(2, Math.round(w * NOISE_FRAC))
  const needCol = Math.max(2, Math.round(h * NOISE_FRAC))
  let y0 = -1, y1 = -1, x0 = -1, x1 = -1
  for (let y = 0; y < h; y++) if (rows[y] >= needRow) { if (y0 < 0) y0 = y; y1 = y }
  for (let x = 0; x < w; x++) if (cols[x] >= needCol) { if (x0 < 0) x0 = x; x1 = x }
  if (y0 < 0 || x0 < 0) return null
  // map downscaled region coords back to full-res image coords
  const sx = (reg.x1 - reg.x0) / w, sy = (reg.y1 - reg.y0) / h
  const fx0 = reg.x0 + x0 * sx, fy0 = reg.y0 + y0 * sy
  const fx1 = reg.x0 + (x1 + 1) * sx, fy1 = reg.y0 + (y1 + 1) * sy
  // reject "whole frame" paper detections (nothing to trim)
  if (!region && (fx1 - fx0) > W * 0.985 && (fy1 - fy0) > H * 0.985) return null
  return { x0: clamp(fx0, 0, W), y0: clamp(fy0, 0, H), x1: clamp(fx1, 0, W), y1: clamp(fy1, 0, H) }
}

function centerBox(W, H, zoom) {
  const side = Math.round(Math.min(W, H) * zoom)
  return { x0: clamp((W - side) / 2, 0, W - side), y0: clamp((H - side) / 2, 0, H - side), side }
}

async function texturedBox(file, W, H) {
  const pap = await detect(file, W, H, PAPER_THRESH, 'bright', null)
  let px0 = pap ? pap.x0 : 0, py0 = pap ? pap.y0 : 0, px1 = pap ? pap.x1 : W, py1 = pap ? pap.y1 : H
  const ins = Math.round(Math.min(px1 - px0, py1 - py0) * INSET)
  px0 += ins; py0 += ins; px1 -= ins; py1 -= ins
  if (px1 - px0 < 8 || py1 - py0 < 8) { px0 = 0; py0 = 0; px1 = W; py1 = H }

  const art = await detect(file, W, H, ART_THRESH, 'dark', { x0: px0, y0: py0, x1: px1, y1: py1 })
  const acx = art ? (art.x0 + art.x1) / 2 : (px0 + px1) / 2
  const acy = art ? (art.y0 + art.y1) / 2 : (py0 + py1) / 2
  const aMax = art ? Math.max(art.x1 - art.x0, art.y1 - art.y0) : Math.min(px1 - px0, py1 - py0) * ART_FILL

  const side = clamp(Math.round(aMax / ART_FILL), 16, Math.min(px1 - px0, py1 - py0))
  const x0 = clamp(acx - side / 2, px0, px1 - side), y0 = clamp(acy - side / 2, py0, py1 - side)
  return { x0, y0, side }
}

async function cropOne(file, outDir, mode) {
  const meta = await sharp(file, { failOn: 'none' }).metadata()
  const W = meta.width, H = meta.height
  const box = mode === 'textured' ? await texturedBox(file, W, H) : centerBox(W, H, mode === 'margin' ? ZOOM_MARGIN : ZOOM_FILLS)
  let pipe = sharp(file, { failOn: 'none' }).removeAlpha()
    .extract({ left: box.x0, top: box.y0, width: box.side, height: box.side })
  if (MAX_EDGE > 0 && box.side > MAX_EDGE) pipe = pipe.resize(MAX_EDGE, MAX_EDGE, { fit: 'fill' })
  const outName = path.basename(file).replace(/\.[^.]+$/, '') + '.jpg'
  await pipe.jpeg({ quality: JPG_QUALITY }).toFile(path.join(outDir, outName))
}

async function main() {
  const target = await resolveTarget()
  console.log('\nflash-cropper-sharp (kiosk crop engine, test run)')
  console.log('Target: ' + target + '\n')
  let grand = 0
  for (const [bucket, mode] of JOBS) {
    const inDir = path.join(target, bucket)
    let files = []
    try { files = (await fs.readdir(inDir)).filter(f => IMG_RE.test(f)) } catch { continue }
    if (!files.length) { console.log(`  ${bucket.padEnd(12)} (no images)`); continue }
    const outDir = path.join(inDir, 'squared-sharp')
    await fs.rm(outDir, { recursive: true, force: true }).catch(() => {})
    await fs.mkdir(outDir, { recursive: true })
    let done = 0, fail = 0
    for (const f of files) {
      try { await cropOne(path.join(inDir, f), outDir, mode); done++ } catch (e) { fail++; console.error(`    ! ${f}: ${e.message}`) }
    }
    grand += done
    console.log(`  ${bucket.padEnd(12)} done ${done}, failed ${fail}  → ${path.join(bucket, 'squared-sharp')}`)
  }
  console.log(`\n  sharp-cropped squares: ${grand}`)
  console.log('  Compare each bucket\'s  squared-sharp/  (sharp) against  squared/  (Photoshop).\n')
}

main().catch(e => { console.error(e); process.exit(1) })
