# flash-crop — one-process flash cropping

Profiles your scanned tattoo flash with AI, sorts each scan into the right bucket,
then crops every bucket to a clean square in Photoshop — **all from one command**.
The AI only **sorts**; it never touches a pixel. Crops are deterministic Photoshop
steps, so the **artwork is never altered** — only the crop and the surrounding paper.

> Validated on a 100-image test set: **96 auto-cropped, 0 failures, 4 routed to
> `manual/`** (multiple drawings / low confidence). Engine: v5.

## What's in here

| File | Role |
|------|------|
| `run-all.mjs` | the orchestrator — runs all 4 steps |
| `run-all.command` | double-click launcher for the orchestrator |
| `crop-core.jsx` | the headless Photoshop engine (all 3 crop modes in one) |
| `single-bucket-scripts/` | the original by-hand `.jsx` (manual fallback) |

## One-time setup

1. Put this whole `flash-crop` folder **inside your scans folder**, right next to
   the images. (Or drop your images into this folder.)
2. Make a plain-text file `openai-key.txt` next to `run-all.mjs` and paste your
   `sk-...` key into it (one line). In TextEdit: **Format ▸ Make Plain Text** first.

## Run it

- **Double-click `run-all.command`**, or
- Terminal: type `node ` (with a space), drag `run-all.mjs` in, press Return, or
- Point at another folder: `node run-all.mjs "/path/to/scans"`

## What happens (the 4 steps)

1. **Profile** — AI looks at every image, writes `profile-log.csv`.
2. **Sort** — copies each image into one of four buckets:
   - `crop-fills/` — clean bg, paper fills the frame → centered square (100%)
   - `crop-margin/` — clean bg, light surround → centered square pulled in (82%)
   - `textured/` — wood/cork/cloth bg → finds the paper + drawing, squares on the art
   - `manual/` — multiple drawings or low confidence → do these by hand
3. **Crop** — opens Photoshop and crops each bucket → a `squared/` subfolder inside it.
4. **Report** — prints how many were cropped and where.

Originals are only **copied** into buckets (set `MOVE=1` to move instead).

## Switches (optional, set before the command)

| Switch | Effect |
|--------|--------|
| `SKIP_PROFILE=1` | reuse the existing `profile-log.csv` (no AI re-run) |
| `SKIP_SORT=1` | leave the buckets as-is; just (re-)run the Photoshop crops |
| `SKIP_PHOTOSHOP=1` | stop after sorting; crop by hand later |
| `SAMPLE=20` | only profile a random 20 (quick test) |
| `MOVE=1` | move originals into buckets instead of copying |
| `CONCURRENCY=4` | parallel AI calls (default 4) |

Example: `SKIP_PROFILE=1 node run-all.mjs` re-sorts + re-crops without paying for AI again.

## If Photoshop can't be driven automatically

The pipeline still profiles + sorts. To finish the crops by hand, copy the matching
script from `single-bucket-scripts/` into its bucket folder and run it via
**Photoshop ▸ File ▸ Scripts ▸ Browse…**:

- `crop-fills.jsx` → `crop-fills/`
- `crop-margin.jsx` → `crop-margin/`
- `crop-textured.jsx` → `textured/`

## After a run

Spot-check each bucket's `squared/` folder. Drag any misses into `manual/`.
A re-run **skips** any bucket whose `squared/` is already full (resume). To force
a fresh crop, delete the `squared` folder inside that bucket and run again.

Tuning levers (top of `crop-core.jsx`):
- `textured/` shows a desk sliver → raise `PAPER_THRESH` (e.g. 195); over-crops an
  aged sheet → lower it (e.g. 150).
- `crop-margin` clips art → raise `ZOOM_MARGIN` (0.82 → 0.85+).
- output size / quality → `MAX_EDGE` (1600) and `JPG_QUALITY` (10).

## Scaling to thousands

Same command, bigger folder — it streams through at concurrency 4 on the AI step
and crops bucket-by-bucket. Cost is pennies per thousand (gpt-4o-mini, low detail).
