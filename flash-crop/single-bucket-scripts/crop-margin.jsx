/*
 * crop-margin.jsx  —  bucket: crop-margin/  (paper doesn't fill frame, LIGHT surround)
 * Centered square pulled in to ~82% so it sits on the paper; a little light
 * surround blends harmlessly. Art untouched.
 * MANUAL FALLBACK: copy this into the crop-margin folder, then run via
 *   Photoshop ▸ File ▸ Scripts ▸ Browse…   Output → squared/ subfolder.
 * (run-all.mjs normally does this for you via crop-core.jsx — this is the by-hand copy.)
 */
#target photoshop
(function () {
  app.displayDialogs = DialogModes.NO
  var ZOOM = 0.82, MAX_EDGE = 1600, JPG_QUALITY = 10
  var u = app.preferences.rulerUnits; app.preferences.rulerUnits = Units.PIXELS
  var here = File($.fileName).parent
  var out = new Folder(here.fsName + '/squared'); if (!out.exists) out.create()
  var files = here.getFiles(function (f) { return f instanceof File && /\.(jpe?g|png|tif|tiff|webp)$/i.test(f.name) })
  var done = 0, fail = 0, log = []
  for (var i = 0; i < files.length; i++) {
    try { one(files[i]); done++ } catch (e) { fail++; log.push(files[i].name + ' :: ' + e) }
  }
  app.preferences.rulerUnits = u
  alert('crop-margin done: ' + done + '   failed: ' + fail + (log.length ? '\n\n' + log.join('\n') : '') + '\n\nSaved to: ' + out.fsName)

  function one(file) {
    var doc = app.open(file)
    if (doc.mode !== DocumentMode.RGB) doc.changeMode(ChangeMode.RGB)
    if (doc.bitsPerChannel !== BitsPerChannelType.EIGHT) doc.bitsPerChannel = BitsPerChannelType.EIGHT
    doc.flatten()
    var W = Math.round(doc.width.as('px')), H = Math.round(doc.height.as('px'))
    var side = Math.round(Math.min(W, H) * ZOOM)
    var x0 = clamp((W - side) / 2, 0, W - side), y0 = clamp((H - side) / 2, 0, H - side)
    doc.crop([UnitValue(x0, 'px'), UnitValue(y0, 'px'), UnitValue(x0 + side, 'px'), UnitValue(y0 + side, 'px')])
    if (MAX_EDGE > 0 && side > MAX_EDGE) doc.resizeImage(UnitValue(MAX_EDGE, 'px'), UnitValue(MAX_EDGE, 'px'), null, ResampleMethod.BICUBICSHARPER)
    var jo = new JPEGSaveOptions(); jo.quality = JPG_QUALITY; jo.embedColorProfile = true
    doc.saveAs(new File(out.fsName + '/' + file.name.replace(/\.[^\.]+$/, '') + '.jpg'), jo, true, Extension.LOWERCASE)
    doc.close(SaveOptions.DONOTSAVECHANGES)
  }
  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, Math.round(v))) }
})();
