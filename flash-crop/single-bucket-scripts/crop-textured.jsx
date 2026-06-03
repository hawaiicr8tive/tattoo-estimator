/*
 * crop-textured.jsx  —  bucket: textured/  (wood / cork / cloth surround).
 * Finds the bright paper, finds the DRAWING inside it, centers a consistent
 * square on the drawing, and keeps it INSIDE the paper (no desk). Art untouched.
 * MANUAL FALLBACK: copy this into textured/, run via Photoshop ▸ File ▸ Scripts ▸ Browse…  → squared/
 *   Sliver of desk showing → raise PAPER_THRESH (195). Over-crops aged sheet → lower (150).
 * (run-all.mjs normally does this for you via crop-core.jsx — this is the by-hand copy.)
 */
#target photoshop
(function () {
  app.displayDialogs = DialogModes.NO
  var PAPER_THRESH = 180, ART_THRESH = 170, ART_FILL = 0.80, INSET = 0.015, MAX_EDGE = 1600, JPG_QUALITY = 10
  var u = app.preferences.rulerUnits; app.preferences.rulerUnits = Units.PIXELS
  var here = File($.fileName).parent
  var out = new Folder(here.fsName + '/squared'); if (!out.exists) out.create()
  var files = here.getFiles(function (f) { return f instanceof File && /\.(jpe?g|png|tif|tiff|webp)$/i.test(f.name) })
  var done = 0, fail = 0, log = []
  for (var i = 0; i < files.length; i++) { try { one(files[i]); done++ } catch (e) { fail++; log.push(files[i].name + ' :: ' + e) } }
  app.preferences.rulerUnits = u
  alert('crop-textured done: ' + done + '   failed/check: ' + fail + (log.length ? '\n\n' + log.join('\n') : '') + '\n\nSaved to: ' + out.fsName)

  function one(file) {
    var doc = app.open(file)
    if (doc.mode !== DocumentMode.RGB) doc.changeMode(ChangeMode.RGB)
    if (doc.bitsPerChannel !== BitsPerChannelType.EIGHT) doc.bitsPerChannel = BitsPerChannelType.EIGHT
    doc.flatten()
    var W = Math.round(doc.width.as('px')), H = Math.round(doc.height.as('px'))

    var pap = detect(doc, W, H, PAPER_THRESH, false, null)         // bright paper bbox
    var px0 = pap ? pap.x0 : 0, py0 = pap ? pap.y0 : 0, px1 = pap ? pap.x1 : W, py1 = pap ? pap.y1 : H
    var ins = Math.round(Math.min(px1 - px0, py1 - py0) * INSET)
    px0 += ins; py0 += ins; px1 -= ins; py1 -= ins

    var art = detect(doc, W, H, ART_THRESH, true, { x0: px0, y0: py0, x1: px1, y1: py1 }) // drawing inside the paper
    var acx = art ? (art.x0 + art.x1) / 2 : (px0 + px1) / 2
    var acy = art ? (art.y0 + art.y1) / 2 : (py0 + py1) / 2
    var aMax = art ? Math.max(art.x1 - art.x0, art.y1 - art.y0) : Math.min(px1 - px0, py1 - py0) * ART_FILL

    var side = clamp(Math.round(aMax / ART_FILL), 16, Math.min(px1 - px0, py1 - py0))
    var x0 = clamp(acx - side / 2, px0, px1 - side), y0 = clamp(acy - side / 2, py0, py1 - side)
    doc.crop([UnitValue(x0, 'px'), UnitValue(y0, 'px'), UnitValue(x0 + side, 'px'), UnitValue(y0 + side, 'px')])
    if (MAX_EDGE > 0 && side > MAX_EDGE) doc.resizeImage(UnitValue(MAX_EDGE, 'px'), UnitValue(MAX_EDGE, 'px'), null, ResampleMethod.BICUBICSHARPER)
    var jo = new JPEGSaveOptions(); jo.quality = JPG_QUALITY; jo.embedColorProfile = true
    doc.saveAs(new File(out.fsName + '/' + file.name.replace(/\.[^\.]+$/, '') + '.jpg'), jo, true, Extension.LOWERCASE)
    doc.close(SaveOptions.DONOTSAVECHANGES)
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
})();
