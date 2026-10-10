#!/usr/bin/env bash
set -euo pipefail
cd /d/Groomly
if ! git remote get-url origin >/dev/null 2>&1; then
  git remote add origin https://github.com/robmass83-ui/Groomly.git
fi
git fetch origin
git merge origin/main --allow-unrelated-histories -m "$(cat <<'EOF'
docs: unisce il README iniziale di GitHub

EOF
)"
git push -u origin HEAD
git push origin HEAD:main
git status --short
git log -1 --oneline
