#!/bin/bash
# Double-click this to run the whole flash-crop pipeline.
# It runs in its own folder, so keep this file next to run-all.mjs + crop-core.jsx.
cd "$(dirname "$0")" || exit 1
echo "Running flash-crop pipeline from: $(pwd)"
node run-all.mjs "$@"
status=$?
echo ""
if [ $status -ne 0 ]; then echo "Finished with an error (code $status)."; fi
echo "Press Return to close this window."
read -r _
