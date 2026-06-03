#!/usr/bin/env node
/*
 * run-all.mjs — the WHOLE pipeline as ONE process.
 *
 *   STEP 1  profile every image with the AI (writes profile-log.csv)
 *   STEP 2  sort them into 4 buckets (crop-fills / crop-margin / textured / manual)
 *   STEP 3  drive Photoshop to crop each bucket → squared/ inside each bucket
 *   STEP 4  print a final report
 *
 * Originals are only COPIED into buckets — never moved or altered. The crops are
 * deterministic Photoshop steps; the AI only sorts, it never touches a pixel.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * SETUP (one time):
 *   1. Put this whole `flash-crop` folder INSIDE your scans folder, right next to
 *      the images (so the images and this folder's files sit together), OR just
 *      drop your images into this folder.
 *   2. Make a text file  openai-key.txt  next to this script and paste your
 *      sk-... key into it (one line). Save as PLAIN TEXT.
 *
 * RUN:
 *   • Double-click  run-all.command          (easiest), OR
 *   • Terminal:  node  <drag run-all.mjs in>  <Return>
 *   • Point it at a different folder:  node run-all.mjs "/path/to/scans"
 *
 * USEFUL SWITCHES (optional, set before the command):
 *   SKIP_PROFILE=1   reuse the existing profile-log.csv (don't call the AI again)
 *   SKIP_PHOTOSHOP=1 stop after sorting (run the .jsx by hand later)
 *   MOVE=1           move originals into buckets instead of copying
 *   SAMPLE=20        only profile a random 20 (quick test)
 *   CONCURRENCY=4    parallel AI calls (default 4)
 * ─────────────────────────────────────────────────────────────────────────────
 */

import fs from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import { fileURLToPath } from 'node:url'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
const exec = promisify(execFile)

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url))
// Images live in the folder you pass, else this script's folder, else its parent.
const inDir = await resolveImageDir()

const SKIP_PROFILE = process.env.SKIP_PROFILE === '1'
const SKIP_SORT = process.env.SKIP_SORT === '1'
const SKIP_PHOTOSHOP = process.env.SKIP_PHOTOSHOP === '1'
const MOVE = process.env.MOVE === '1'
const MODEL = process.env.MODEL || 'gpt-4o-mini'
const CONCURRENCY = Math.max(1, parseInt(process.env.CONCURRENCY || '4', 10))
const SAMPLE = parseInt(process.env.SAMPLE || '0', 10)
const IMG_RE = /\.(jpe?g|png|tif|tiff|webp)$/i
const BUCKETS = ['crop-fills', 'crop-margin', 'textured', 'manual']
const CROP_JOBS = [ // bucket → crop-core.jsx mode
  { bucket: 'crop-fills', mode: 'fills' },
  { bucket: 'crop-margin', mode: 'margin' },
  { bucket: 'textured', mode: 'textured' },
]

// ── API key: env var, or openai-key.txt next to the script / images ──
let API_KEY = process.env.OPENAI_API_KEY || ''
for (const d of [SCRIPT_DIR, inDir]) {
  if (API_KEY) break
  try { API_KEY = (await fs.readFile(path.join(d, 'openai-key.txt'), 'utf8')).trim() } catch {}
}

const PROMPT =
  'You are examining a photo/scan of hand-drawn tattoo flash (black ink on paper). ' +
  'The goal later is to crop it to a clean SQUARE WITHOUT touching the artwork — only the crop and the paper/background. ' +
  'Describe ONLY what you see, as strict JSON:\n' +
  '{\n' +
  '  "background": "clean_light | wood | cork | cloth_fabric | other_textured | busy",  // the surface the sheet RESTS ON, visible around its edges. Use clean_light ONLY if the paper fills the whole frame, OR the surround is plain seamless white. If ANY table/desk/board/mat is visible around the paper — even pale, light, or slightly-blurred wood/cork — name that surface, NOT clean_light.\n' +
  '  "paper_fills_frame": true|false,        // true ONLY if the paper takes up essentially the whole image with little/no surface showing\n' +
  '  "margin": "ample | medium | tight",\n' +
  '  "orientation": "landscape | portrait | square",\n' +
  '  "art_style": "linework | solid_dotwork | mixed",\n' +
  '  "art_centered": true|false,\n' +
  '  "drawings": 1,\n' +
  '  "lettering": true|false,\n' +
  '  "skew": "none | slight | strong",\n' +
  '  "confidence": 0.0-1.0,\n' +
  '  "notes": "a few words"\n' +
  '}\n' +
  'Output the JSON object only.'

const FIELDS = ['background', 'paper_fills_frame', 'margin', 'orientation', 'art_style', 'art_centered', 'drawings', 'lettering', 'skew', 'confidence', 'notes']

// ───────────────────────── STEP 1: profile ─────────────────────────
async function shrinkToDataUrl(file) {
  const tmp = path.join(os.tmpdir(), `flashprof-${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`)
  try {
    await exec('sips', ['-Z', '640', file, '--out', tmp])
    const b = await fs.readFile(tmp); fs.unlink(tmp).catch(() => {})
    return `data:image/jpeg;base64,${b.toString('base64')}`
  } catch {
    const b = await fs.readFile(file)
    const ext = path.extname(file).slice(1).toLowerCase()
    const mime = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg'
    return `data:${mime};base64,${b.toString('base64')}`
  }
}

async function profileOne(file) {
  const dataUrl = await shrinkToDataUrl(file)
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${API_KEY}` },
    body: JSON.stringify({
      model: MODEL, temperature: 0, max_tokens: 200, response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: PROMPT },
        { role: 'user', content: [
          { type: 'text', text: 'Profile this flash scan.' },
          { type: 'image_url', image_url: { url: dataUrl, detail: 'low' } },
        ] },
      ],
    }),
  })
  if (!res.ok) throw new Error(`OpenAI ${res.status}: ${(await res.text()).slice(0, 160)}`)
  return JSON.parse((await res.json()).choices?.[0]?.message?.content || '{}')
}

function cell(s) { return `"${String(s ?? '').replace(/"/g, '""')}"` }
function bump(t, k, v) { (t[k] ||= {}); const key = String(v); t[k][key] = (t[k][key] || 0) + 1 }

async function stepProfile() {
  const csvPath = path.join(inDir, 'profile-log.csv')
  if (SKIP_PROFILE) {
    try { await fs.access(csvPath); console.log('STEP 1  skipped (reusing existing profile-log.csv)\n'); return }
    catch { console.log('STEP 1  SKIP_PROFILE set but no profile-log.csv found — profiling anyway.\n') }
  }
  if (!API_KEY) {
    console.error('\nNo OpenAI API key found.\n  → Make a file called  openai-key.txt  next to run-all.mjs,\n    paste your  sk-...  key into it, save, and run again.\n    (Or set SKIP_PROFILE=1 to reuse an existing profile-log.csv.)\n')
    process.exit(1)
  }

  const self = path.basename(fileURLToPath(import.meta.url))
  let files = (await fs.readdir(inDir)).filter(f => IMG_RE.test(f) && f !== self)
  if (!files.length) { console.error('No images found in:\n  ' + inDir); process.exit(1) }
  if (SAMPLE > 0 && files.length > SAMPLE) {
    for (let i = files.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0;[files[i], files[j]] = [files[j], files[i]] }
    files = files.slice(0, SAMPLE)
  }

  console.log(`STEP 1  Profiling ${files.length} images with ${MODEL} (concurrency ${CONCURRENCY})…`)
  const rows = [['file', ...FIELDS].join(',')]
  const tally = {}
  let done = 0
  const queue = [...files]
  async function worker() {
    for (;;) {
      const name = queue.shift(); if (!name) return
      let r
      try { r = await profileOne(path.join(inDir, name)) }
      catch (e) { r = { notes: 'error: ' + e.message, confidence: 0 } }
      rows.push([cell(name), ...FIELDS.map(f => cell(r[f]))].join(','))
      for (const f of ['background', 'paper_fills_frame', 'margin', 'orientation', 'art_style', 'art_centered', 'drawings', 'lettering', 'skew']) bump(tally, f, r[f])
      done++
      if (done % 5 === 0 || done === files.length) process.stdout.write(`\r  ${done}/${files.length}`)
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, queue.length) }, worker))
  await fs.writeFile(csvPath, rows.join('\n'))

  console.log('\n  attribute counts:')
  for (const f of Object.keys(tally)) {
    const parts = Object.entries(tally[f]).sort((a, b) => b[1] - a[1]).map(([k, n]) => `${k}:${n}`)
    console.log(`    ${f.padEnd(18)} ${parts.join('  ')}`)
  }
  console.log(`  → ${csvPath}\n`)
}

// ───────────────────────── STEP 2: sort ─────────────────────────
function parseCSV(text) {
  const rows = []
  let row = [], cur = '', q = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (q) {
      if (c === '"') { if (text[i + 1] === '"') { cur += '"'; i++ } else q = false }
      else cur += c
    } else {
      if (c === '"') q = true
      else if (c === ',') { row.push(cur); cur = '' }
      else if (c === '\n' || c === '\r') { if (cur !== '' || row.length) { row.push(cur); rows.push(row); row = []; cur = '' } }
      else cur += c
    }
  }
  if (cur !== '' || row.length) { row.push(cur); rows.push(row) }
  return rows
}

function bucketFor(r) {
  const drawings = String(r.drawings || '1').trim()
  const conf = parseFloat(r.confidence)
  const bg = String(r.background || '').toLowerCase()
  if (drawings !== '1' || (isFinite(conf) && conf < 0.6)) return 'manual'
  if (bg && bg !== 'clean_light') return 'textured'
  return String(r.paper_fills_frame).toLowerCase() === 'true' ? 'crop-fills' : 'crop-margin'
}

async function bucketImageCount(b) {
  try { return (await fs.readdir(path.join(inDir, b))).filter(f => IMG_RE.test(f)).length }
  catch { return 0 }
}

async function stepSort() {
  // SKIP_SORT: keep the buckets exactly as they are (incl. any squared/ from a
  // partial run) and just count them — lets you re-run only the Photoshop step.
  if (SKIP_SORT) {
    const counts = {}
    for (const b of BUCKETS) counts[b] = await bucketImageCount(b)
    console.log('STEP 2  skipped (SKIP_SORT=1). Existing buckets:')
    for (const b of BUCKETS) console.log(`    ${b.padEnd(12)} ${counts[b]}`)
    console.log('')
    return counts
  }

  const csvPath = path.join(inDir, 'profile-log.csv')
  let text
  try { text = await fs.readFile(csvPath, 'utf8') }
  catch { console.error('STEP 2  Could not find profile-log.csv. Run the profiler first.'); process.exit(1) }

  const rows = parseCSV(text)
  const header = rows.shift().map(h => h.trim())
  const idx = {}; header.forEach((h, i) => idx[h] = i)
  if (idx.file === undefined) { console.error('profile-log.csv has no "file" column.'); process.exit(1) }

  // start clean so re-runs don't leave stale copies
  for (const b of BUCKETS) {
    await fs.rm(path.join(inDir, b), { recursive: true, force: true }).catch(() => {})
    await fs.mkdir(path.join(inDir, b), { recursive: true })
  }

  const counts = { 'crop-fills': 0, 'crop-margin': 0, 'textured': 0, 'manual': 0 }
  let missing = 0
  for (const cols of rows) {
    if (!cols.length || cols[idx.file] === undefined) continue
    const r = {}; header.forEach((h, i) => r[h] = cols[i])
    const name = r.file
    if (!name) continue
    const src = path.join(inDir, name)
    try { await fs.access(src) } catch { missing++; continue }
    const b = bucketFor(r)
    const dest = path.join(inDir, b, name)
    try { if (MOVE) await fs.rename(src, dest); else await fs.copyFile(src, dest); counts[b]++ }
    catch (e) { console.error('  copy failed for ' + name + ': ' + e.message) }
  }

  console.log('STEP 2  Sorted into buckets:')
  for (const b of BUCKETS) console.log(`    ${b.padEnd(12)} ${counts[b]}`)
  if (missing) console.log(`    (skipped ${missing} rows whose image wasn't found)`)
  console.log('')
  return counts
}

// ───────────────────────── STEP 3: Photoshop crops ─────────────────────────
async function photoshopHere() {
  // returns the Photoshop bundle id if available, else null
  try {
    const { stdout } = await exec('osascript', ['-e', 'id of application id "com.adobe.Photoshop"'])
    return stdout.trim() || 'com.adobe.Photoshop'
  } catch { return null }
}

async function runCrop(bucket, mode) {
  const folder = path.join(inDir, bucket)
  const jsx = path.join(SCRIPT_DIR, 'crop-core.jsx')
  const resultFile = path.join(folder, '_crop-result.json')
  await fs.rm(resultFile, { force: true }).catch(() => {})

  // Write a tiny wrapper that sets the params as globals then runs the engine.
  // (Passing them via AppleScript `with arguments` doesn't work — inside the
  //  engine's function `arguments` is the function's own, not the passed values.)
  const wrapperPath = path.join(SCRIPT_DIR, `_run-${mode}.jsx`)
  const wrapper =
    `#target photoshop\n` +
    `var CROP_FOLDER = ${JSON.stringify(folder)};\n` +
    `var CROP_MODE = ${JSON.stringify(mode)};\n` +
    `$.evalFile(new File(${JSON.stringify(jsx)}));\n`
  await fs.writeFile(wrapperPath, wrapper)

  // `with timeout` lifts AppleScript's default 2-min Apple Event ceiling — without
  // it a big bucket throws -1712 (timed out) even though Photoshop is still cropping.
  const ascript =
    `with timeout of 86400 seconds\n` +
    `  tell application id "com.adobe.Photoshop"\n` +
    `    activate\n` +
    `    do javascript file ${JSON.stringify(wrapperPath)}\n` +
    `  end tell\n` +
    `end timeout`
  try {
    await exec('osascript', ['-e', ascript], { maxBuffer: 1 << 24, timeout: 0 })
  } finally {
    await fs.rm(wrapperPath, { force: true }).catch(() => {})
  }

  try { return JSON.parse(await fs.readFile(resultFile, 'utf8')) }
  catch { return null }
}

async function stepPhotoshop(counts) {
  const jobs = CROP_JOBS.filter(j => (counts[j.bucket] || 0) > 0)
  if (!jobs.length) { console.log('STEP 3  nothing to crop.\n'); return [] }

  if (SKIP_PHOTOSHOP) {
    console.log('STEP 3  skipped (SKIP_PHOTOSHOP=1). Run the crops by hand:')
    for (const j of jobs) console.log(`    Photoshop ▸ File ▸ Scripts ▸ Browse… → single-bucket-scripts/crop-${j.bucket === 'crop-fills' ? 'fills' : j.bucket === 'crop-margin' ? 'margin' : 'textured'}.jsx  (run on the ${j.bucket}/ folder)`)
    console.log('')
    return []
  }

  const ps = await photoshopHere()
  if (!ps) {
    console.log('STEP 3  Photoshop not found / not scriptable on this machine.')
    console.log('        Everything is sorted — finish the crops by hand:')
    for (const j of jobs) {
      const f = j.bucket === 'crop-fills' ? 'fills' : j.bucket === 'crop-margin' ? 'margin' : 'textured'
      console.log(`    Photoshop ▸ File ▸ Scripts ▸ Browse… → single-bucket-scripts/crop-${f}.jsx   (it crops the ${j.bucket}/ folder)`)
    }
    console.log('')
    return []
  }

  console.log('STEP 3  Cropping in Photoshop (this opens Photoshop; leave it alone while it runs)…')
  const results = []
  for (const j of jobs) {
    // resume: if squared/ already holds every image for this bucket, don't redo it
    const want = counts[j.bucket]
    let have = 0
    try { have = (await fs.readdir(path.join(inDir, j.bucket, 'squared'))).filter(f => /\.jpe?g$/i.test(f)).length } catch {}
    if (want > 0 && have >= want) {
      console.log(`    ${j.bucket.padEnd(12)} already cropped (${have}) — skipping`)
      results.push({ bucket: j.bucket, done: have, fail: 0, skipped: true })
      continue
    }
    process.stdout.write(`    ${j.bucket.padEnd(12)} (${counts[j.bucket]} imgs)… `)
    let r = null
    try { r = await runCrop(j.bucket, j.mode) } catch (e) { console.log('ERROR: ' + e.message); results.push({ bucket: j.bucket, error: e.message }); continue }
    if (r) { console.log(`done ${r.done}, failed ${r.fail}`); results.push({ bucket: j.bucket, ...r }) }
    else { console.log('finished (no result file — check the bucket\'s squared/ folder)'); results.push({ bucket: j.bucket }) }
  }
  console.log('')
  return results
}

// ───────────────────────── STEP 4: report ─────────────────────────
function report(counts, cropResults) {
  console.log('════════════════════ DONE ════════════════════')
  console.log(`Folder: ${inDir}\n`)
  let cropped = 0
  for (const j of CROP_JOBS) {
    const r = (cropResults || []).find(x => x.bucket === j.bucket)
    const n = counts[j.bucket] || 0
    if (!n) continue
    if (r && typeof r.done === 'number') { cropped += r.done; console.log(`  ${j.bucket.padEnd(12)} ${r.done}/${n} cropped → ${path.join(j.bucket, 'squared')}` + (r.fail ? `   (${r.fail} need a look)` : '')) }
    else console.log(`  ${j.bucket.padEnd(12)} ${n} sorted — crop by hand (single-bucket-scripts/)`)
  }
  if (counts.manual) console.log(`  ${'manual'.padEnd(12)} ${counts.manual} → do these by hand (multiple drawings / low confidence)`)
  console.log(`\n  cropped squares: ${cropped}`)
  console.log('  Spot-check each bucket\'s squared/ folder; move any misses into manual/.')
  console.log('═══════════════════════════════════════════════')
}

// ───────────────────────── helpers / main ─────────────────────────
async function resolveImageDir() {
  const arg = process.argv[2]
  if (arg) return path.resolve(arg)
  for (const d of [SCRIPT_DIR, path.dirname(SCRIPT_DIR)]) {
    try {
      const fs2 = await import('node:fs/promises')
      const files = await fs2.readdir(d)
      if (files.some(f => IMG_RE.test(f))) return d
    } catch {}
  }
  return SCRIPT_DIR
}

async function main() {
  console.log('\nFlash crop pipeline')
  console.log('Images: ' + inDir + '\n')
  await stepProfile()
  const counts = await stepSort()
  const cropResults = await stepPhotoshop(counts)
  report(counts, cropResults)
}

main().catch(e => { console.error(e); process.exit(1) })
