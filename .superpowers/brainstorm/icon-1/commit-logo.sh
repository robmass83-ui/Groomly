#!/usr/bin/env bash
set -euo pipefail
cd /d/Groomly
git add -- "docs/superpowers/specs/2026-10-09-groomly-logo-design.md"
git commit -m "$(cat <<'EOF'
docs: specifica dove stanno logo e icona

I file SVG restano invariati e la specifica fissa Home, login e favicon.

EOF
)"
git status --short
