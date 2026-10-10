#!/usr/bin/env bash
set -euo pipefail
cd /d/Groomly
git add -- src/pages/HomePage.tsx src/pages/shellPages.test.tsx
git commit -m "$(cat <<'EOF'
feat: mette l'icona rotonda nell'intestazione della Home

EOF
)"
