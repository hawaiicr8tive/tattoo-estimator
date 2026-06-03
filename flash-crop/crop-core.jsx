/*
 * crop-core.jsx — ONE headless engine for all three crop modes (ENGINE v5).
 *
 * run-all.mjs drops a copy of this (with `var CROP_MODE="…";` baked on top) INTO
 * the bucket folder and runs it there — so File($.fileName).parent IS the bucket,
 * exactly like the original crop-*.jsx that worked via File ▸ Scripts ▸ Browse.
 *
 * mode = "fills"   → centered square, full short edge (ZOOM 1.0)   [paper fills frame]
 * mode = "margin"  → centered square pulled in to 82% (ZOOM 0.82)  [light surround blends]
 * mode = "textured"→ find bright paper, find drawing inside it, center a square
 *                    on the drawing and keep it INSIDE the paper (no desk).
 *
 * Art is NEVER altered — only the crop and surrounding paper. No alert(); it writes
 * _crop-result.json (a "started" marker first, then the final tally) so run-all.mjs
 * — and you — can see exactly what happened even if something goes wrong.
 */
#target photoshop
(function () {
  app.displayDialogs = DialogModes.NO

  // Where this script sits = the bucket. (CROP_FOLDER global overrides if present.)
  var here
  try { here = File($.fileName).parent } catch (e) { here = Folder.current }
  if (typeof CROP_FOLDER !== 'undefined' && CROP_FOLDER) here = new Folder(CROP_FOLDER)
  var folderPath = here.fsName
  var resultPath = folderPath + '/_crop-result.json'
  var mode = String((typeof CROP_MODE !== 'undefined' && CROP_MODE) ? CROP_MODE : 'fills')

  var MAX_EDGE = 1600, JPG_QUALITY = 10
  var ZOOM_FILLS = 1.0, ZOOM_MARGIN = 0.82
  var PAPER_THRESH = 180, ART_THRESH = 170, ART_FILL = 0.80, INSET = 0.015

  var out = new Folder(folderPath + '/squared'); if (!out.exists) out.create()
  var files = here.getFiles(function (f) { return f instanceof File && /\.(jpe?g|png|tif|tiff|webp)$/i.test(f.name) })

  // "started" marker — proves the engine launched and shows what it sees.
  writeResult('started', 0, 0, [])

  var u = app.preferences.rulerUnits; app.preferences.rulerUnits = Units.PIXELS
  var done = 0, fail = 0, log = []
  try {
    for (var i = 0; i < files.length; i++) {
      try { one(files[i]); done++ } catch (e) { fail++; log.push(files[i].name + ' :: ' + e) }
    }
  } catch (eAll) { log.push('FATAL :: ' + eAll) }
  app.preferences.rulerUnits = u
  writeResult('done', done, fail, log)

  // ---------- result file ----------
  function writeResult(status, done, fail, errors) {
    try {
      var esc = []
      for (var k = 0; k < (errors || []).length; k++) esc.push('"' + jsonEsc(errors[k]) + '"')
      var s = '{"status":"' + status + '","engine":"v5","mode":"' + mode + '","folder":"' + jsonEsc(folderPath) +
        '","files":' + files.length + ',"done":' + done + ',"fail":' + fail +
        ',"out":"' + jsonEsc(out.fsName) + '","errors":[' + esc.join(',') + ']}'
      var rf = new File(resultPath); rf.encoding = 'UTF-8'; rf.open('w'); rf.write(s); rf.close()
    } catch (e) {}
  }

  // ---------- per-file ----------
  function one(file) {
    var doc = app.open(file)
    if (doc.mode !== DocumentMode.RGB) doc.changeMode(ChangeMode.RGB)
    if (doc.bitsPerChannel !== BitsPerChannelType.EIGHT) doc.bitsPerChannel = BitsPerChannelType.EIGHT
    doc.flatten()
    var W = Math.round(doc.width.as('px')), H = Math.round(doc.height.as('px'))

    var box
    if (mode === 'textured') box = texturedBox(doc, W, H)
    else box = centerBox(W, H, mode === 'margin' ? ZOOM_MARGIN : ZOOM_FILLS)

    doc.crop([UnitValue(box.x0, 'px'), UnitValue(box.y0, 'px'),
              UnitValue(box.x0 + box.side, 'px'), UnitValue(box.y0 + box.side, 'px')])
    if (MAX_EDGE > 0 && box.side > MAX_EDGE)
      doc.resizeImage(UnitValue(MAX_EDGE, 'px'), UnitValue(MAX_EDGE, 'px'), null, ResampleMethod.BICUBICSHARPER)

    var jo = new JPEGSaveOptions(); jo.quality = JPG_QUALITY; jo.embedColorProfile = true
    doc.saveAs(new File(out.fsName + '/' + file.name.replace(/\.[^\.]+$/, '') + '.jpg'), jo, true, Extension.LOWERCASE)
    doc.close(SaveOptions.DONOTSAVECHANGES)
  }

  // ---------- simple centered crop (fills / margin) ----------
  function centerBox(W, H, zoom) {
    var side = Math.round(Math.min(W, H) * zoom)
    var x0 = clamp((W - side) / 2, 0, W - side), y0 = clamp((H - side) / 2, 0, H - side)
    return { x0: x0, y0: y0, side: side }
  }

  // ---------- paper-aware crop (textured) ----------
  function texturedBox(doc, W, H) {
    var pap = detect(doc, W, H, PAPER_THRESH, false, null)          // bright paper bbox
    var px0 = pap ? pap.x0 : 0, py0 = pap ? pap.y0 : 0, px1 = pap ? pap.x1 : W, py1 = pap ? pap.y1 : H
    var ins = Math.round(Math.min(px1 - px0, py1 - py0) * INSET)
    px0 += ins; py0 += ins; px1 -= ins; py1 -= ins

    var art = detect(doc, W, H, ART_THRESH, true, { x0: px0, y0: py0, x1: px1, y1: py1 }) // drawing in paper
    var acx = art ? (art.x0 + art.x1) / 2 : (px0 + px1) / 2
    var acy = art ? (art.y0 + art.y1) / 2 : (py0 + py1) / 2
    var aMax = art ? Math.max(art.x1 - art.x0, art.y1 - art.y0) : Math.min(px1 - px0, py1 - py0) * ART_FILL

    var side = clamp(Math.round(aMax / ART_FILL), 16, Math.min(px1 - px0, py1 - py0))
    var x0 = clamp(acx - side / 2, px0, px1 - side), y0 = clamp(acy - side / 2, py0, py1 - side)
    return { x0: x0, y0: y0, side: side }
  }

  // threshold + trim on the real doc, then History-revert. region (or null), blur for art.
  function detect(doc, W, H, thresh, blur, region) {
    var snap = doc.activeHistoryState
    try {
      doc.activeLayer.desaturate()
      var ox = 0, oy = 0
      if (region) { doc.crop([UnitValue(region.x0, 'px'), UnitValue(region.y0, 'px'), UnitValue(region.x1, 'px'), UnitValue(region.y1, 'px')]); ox = region.x0; oy = region.y0 }
      if (blur) { try { doc.activeLayer.applyGaussianBlur(Math.max(2, Math.round(Math.min(W, H) * 0.004))) } catch (e) {} }
      else { var medR = Math.max(3, Math.round(Math.min(W, H) * 0.005)); try { doc.activeLayer.applyMedianNoise(medR) } catch (e) {} }
      doc.activeLayer.adjustLevels(thresh, thresh + 1, 1.0, 0, 255)
      var T = trimEdge(doc, 'top'), L = trimEdge(doc, 'left'); trimEdge(doc, 'bottom'); trimEdge(doc, 'right')
      var w = Math.round(doc.width.as('px')), h = Math.round(doc.height.as('px'))
      doc.activeHistoryState = snap
      if (w < 8 || h < 8) return null
      if (!region && w > W * 0.985 && h > H * 0.985) return null
      return { x0: ox + L, y0: oy + T, x1: ox + L + w, y1: oy + T + h }
    } catch (e2) { try { doc.activeHistoryState = snap } catch (e3) {} return null }
  }
  function trimEdge(d, edge) {
    if (edge === 'top') { var h = d.height.as('px'); d.trim(TrimType.TOPLEFT, true, false, false, false); return h - d.height.as('px') }
    if (edge === 'left') { var w = d.width.as('px'); d.trim(TrimType.TOPLEFT, false, true, false, false); return w - d.width.as('px') }
    if (edge === 'bottom') { var h2 = d.height.as('px'); d.trim(TrimType.BOTTOMRIGHT, false, false, true, false); return h2 - d.height.as('px') }
    var w2 = d.width.as('px'); d.trim(TrimType.BOTTOMRIGHT, false, false, false, true); return w2 - d.width.as('px')
  }
  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, Math.round(v))) }
  function jsonEsc(s) { return String(s).replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/[\r\n]+/g, ' ') }
})();
