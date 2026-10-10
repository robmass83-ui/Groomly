#!/usr/bin/env bash
set -euo pipefail
cd /d/Groomly
git add -- index.html src/brand.test.ts
git commit -m "$(cat <<'EOF'
feat: usa l'icona rotonda nella scheda del browser

EOF
)"
