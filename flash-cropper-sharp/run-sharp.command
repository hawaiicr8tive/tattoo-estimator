#!/bin/bash
# Double-click to crop the existing buckets with sharp (no Photoshop) and compare.
# Keep this folder INSIDE your flash-crop folder (so the buckets are one level up).
cd "$(dirname "$0")" || exit 1
echo "flash-cropper-sharp — running from: $(pwd)"
if [ ! -d node_modules/sharp ]; then
  echo "Installing sharp (one-time, ~20s)…"
  npm install || { echo "npm install failed — is Node installed?"; echo "Press Return."; read -r _; exit 1; }
fi
node crop-sharp.mjs "$@"
echo ""
echo "Press Return to close this window."
read -r _
