#!/usr/bin/env bash
set -euo pipefail
cd /d/Groomly
git add -- src/pages/LoginPage.tsx src/pages/LoginPage.test.tsx
git commit -m "$(cat <<'EOF'
feat: mostra il marchio nella schermata di accesso

EOF
)"
