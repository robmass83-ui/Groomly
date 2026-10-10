#!/usr/bin/env bash
set -euo pipefail
cd /d/Groomly
git add -- src/brand.test.ts src/assets/brand public/groomly-icon.svg
git commit -m "$(cat <<'EOF'
test: copia i marchi SVG senza modificarli

EOF
)"
git status --short
