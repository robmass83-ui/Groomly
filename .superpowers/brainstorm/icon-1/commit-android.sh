#!/usr/bin/env bash
set -euo pipefail
cd /d/Groomly
git add -- android/app/src/main/res
git commit -m "$(cat <<'EOF'
feat: usa il marchio come icona e splash dell'app Android

EOF
)"
