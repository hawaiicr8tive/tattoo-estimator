# flash-cropper-sharp — kiosk crop engine (test it first)

This is the **same crop logic** as the Photoshop engine (`crop-core.jsx`), reimplemented
with [`sharp`](https://sharp.pixelplumbing.com/) so it can run **server-side in the
kiosk — no Photoshop**. Run it here first to confirm it crops as well as Photoshop did,
*before* we wire it into the admin app.

Like Photoshop, it **only crops + resizes** — never repaints a pixel — so the artwork
stays 100% untouched. Detection only decides the crop box.

## Run the A/B test

1. Put this `flash-cropper-sharp` folder **inside your `flash-crop` folder** (so the
   `crop-fills/ crop-margin/ textured/` buckets are one level up).
2. Double-click **`run-sharp.command`**. First run installs `sharp` once (~20s), then crops.

It writes a **`squared-sharp/`** subfolder inside each bucket, right next to Photoshop's
`squared/`. Open them side by side and compare.

(Advanced: `node crop-sharp.mjs "/path/to/flash-crop"` to point it somewhere else.)

## What to compare

- **crop-fills / crop-margin** — these are plain centered squares, so sharp's output
  should be essentially identical to Photoshop's.
- **textured** — this is the real test: does sharp find the paper + art and crop the
  square onto the paper (no desk) as well as Photoshop did?

## Same tuning knobs as crop-core.jsx (top of `crop-sharp.mjs`)

| Knob | Meaning |
|------|---------|
| `PAPER_THRESH` (180) | brightness that counts as paper — raise if desk sneaks in, lower if it over-crops an aged sheet |
| `ART_THRESH` (170) | darkness that counts as ink |
| `ART_FILL` (0.80) | how much of the square the art fills |
| `ZOOM_MARGIN` (0.82) | center-crop pull-in for the margin bucket |
| `NOISE_FRAC` (0.004) | ignore specks/foxing smaller than this fraction of the edge |
| `MAX_EDGE` (1600) / `JPG_QUALITY` (92) | output size / quality |

Once the `squared-sharp/` results look as good as `squared/`, I'll port this exact engine
into a kiosk **Flash Cropper** admin tab (upload/select scans → profile → sort → crop →
into the flash library), with these same knobs exposed.
