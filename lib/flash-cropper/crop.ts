import sharp from 'sharp'

/**
 * Flash crop engine (server-side, sharp) — the SAME logic validated in the
 * standalone crop-sharp.mjs / Photoshop crop-core.jsx. It ONLY crops + resizes;
 * it never repaints a pixel, so the artwork stays untouched. Detection only
 * decides the crop box.
 */

export type CropMode = 'fills' | 'margin' | 'textured'

// knobs (identical to crop-core.jsx / crop-sharp.mjs)
const MAX_EDGE = 1600
const JPG_QUALITY = 92
const ZOOM_FILLS = 1.0
const ZOOM_MARGIN = 0.82
const PAPER_THRESH = 180
const ART_THRESH = 170
const ART_FILL = 0.8
const INSET = 0.015
const DETECT_W = 1400      // detect on a downscaled copy for speed
const NOISE_FRAC = 0.004   // ignore rows/cols with fewer hits than this (speck reject)

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, Math.round(v)))

interface Box { x0: number; y0: number; side: number }
interface Region { x0: number; y0: number; x1: number; y1: number }

// greyscale + light denoise, downscaled raw bytes for a region of the image
async function grayRaw(input: Buffer, region: Region) {
  let pipe = sharp(input, { failOn: 'none' }).removeAlpha().greyscale()
  pipe = pipe.extract({ left: region.x0, top: region.y0, width: region.x1 - region.x0, height: region.y1 - region.y0 })
  pipe = pipe.resize({ width: DETECT_W, fit: 'inside', withoutEnlargement: true }).median(3)
  const { data, info } = await pipe.raw().toBuffer({ resolveWithObject: true })
  return { data, w: info.width, h: info.height }
}

// bbox of qualifying pixels (bright = paper, dark = art), mapped back to full-res
async function detect(input: Buffer, W: number, H: number, thresh: number, kind: 'bright' | 'dark', region: Region | null): Promise<Region | null> {
  const reg = region || { x0: 0, y0: 0, x1: W, y1: H }
  const { data, w, h } = await grayRaw(input, reg)
  if (!w || !h) return null
  const rows = new Array(h).fill(0)
  const cols = new Array(w).fill(0)
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
  const sx = (reg.x1 - reg.x0) / w, sy = (reg.y1 - reg.y0) / h
  const fx0 = reg.x0 + x0 * sx, fy0 = reg.y0 + y0 * sy
  const fx1 = reg.x0 + (x1 + 1) * sx, fy1 = reg.y0 + (y1 + 1) * sy
  if (!region && (fx1 - fx0) > W * 0.985 && (fy1 - fy0) > H * 0.985) return null // whole frame = nothing to trim
  return { x0: clamp(fx0, 0, W), y0: clamp(fy0, 0, H), x1: clamp(fx1, 0, W), y1: clamp(fy1, 0, H) }
}

function centerBox(W: number, H: number, zoom: number): Box {
  const side = Math.round(Math.min(W, H) * zoom)
  return { x0: clamp((W - side) / 2, 0, W - side), y0: clamp((H - side) / 2, 0, H - side), side }
}

async function texturedBox(input: Buffer, W: number, H: number): Promise<Box> {
  const pap = await detect(input, W, H, PAPER_THRESH, 'bright', null)
  let px0 = pap ? pap.x0 : 0, py0 = pap ? pap.y0 : 0, px1 = pap ? pap.x1 : W, py1 = pap ? pap.y1 : H
  const ins = Math.round(Math.min(px1 - px0, py1 - py0) * INSET)
  px0 += ins; py0 += ins; px1 -= ins; py1 -= ins
  if (px1 - px0 < 8 || py1 - py0 < 8) { px0 = 0; py0 = 0; px1 = W; py1 = H }

  const art = await detect(input, W, H, ART_THRESH, 'dark', { x0: px0, y0: py0, x1: px1, y1: py1 })
  const acx = art ? (art.x0 + art.x1) / 2 : (px0 + px1) / 2
  const acy = art ? (art.y0 + art.y1) / 2 : (py0 + py1) / 2
  const aMax = art ? Math.max(art.x1 - art.x0, art.y1 - art.y0) : Math.min(px1 - px0, py1 - py0) * ART_FILL

  const side = clamp(Math.round(aMax / ART_FILL), 16, Math.min(px1 - px0, py1 - py0))
  const x0 = clamp(acx - side / 2, px0, px1 - side)
  const y0 = clamp(acy - side / 2, py0, py1 - side)
  return { x0, y0, side }
}

/** Crop one image buffer to a square JPEG using the given mode. Art untouched. */
export async function cropImage(input: Buffer, mode: CropMode): Promise<Buffer> {
  const meta = await sharp(input, { failOn: 'none' }).metadata()
  const W = meta.width ?? 0, H = meta.height ?? 0
  if (!W || !H) throw new Error('Could not read image dimensions')

  const box = mode === 'textured'
    ? await texturedBox(input, W, H)
    : centerBox(W, H, mode === 'margin' ? ZOOM_MARGIN : ZOOM_FILLS)

  let pipe = sharp(input, { failOn: 'none' }).removeAlpha()
    .extract({ left: box.x0, top: box.y0, width: box.side, height: box.side })
  if (MAX_EDGE > 0 && box.side > MAX_EDGE) pipe = pipe.resize(MAX_EDGE, MAX_EDGE, { fit: 'fill' })
  return pipe.jpeg({ quality: JPG_QUALITY }).toBuffer()
}

/** Downscaled JPEG (for sending to the vision model — cheap + fast). */
export async function thumbForVision(input: Buffer, width = 768): Promise<Buffer> {
  return sharp(input, { failOn: 'none' }).removeAlpha()
    .resize({ width, fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 80 }).toBuffer()
}
