#!/usr/bin/env bash
set -euo pipefail
cd /d/Groomly
git add -- "Icon and logo" \
  docs/superpowers/plans/2026-10-09-groomly-finale.md \
  docs/superpowers/plans/2026-10-09-groomly-logo.md \
  docs/superpowers/plans/archive \
  docs/superpowers/specs/2026-10-09-groomly-finale-design.md \
  docs/superpowers/specs/archive \
  docs/superpowers/plans/2026-10-01-groomly-fondazione.md \
  docs/superpowers/plans/2026-10-03-groomly-appuntamenti.md \
  docs/superpowers/plans/2026-10-03-groomly-cani.md \
  docs/superpowers/plans/2026-10-03-groomly-mensili.md \
  docs/superpowers/plans/2026-10-09-groomly-completato.md \
  docs/superpowers/specs/2026-10-01-groomly-fondazione-design.md \
  docs/superpowers/specs/2026-10-03-groomly-appuntamenti-design.md \
  docs/superpowers/specs/2026-10-03-groomly-cani-design.md \
  docs/superpowers/specs/2026-10-03-groomly-mensili-design.md \
  docs/superpowers/specs/2026-10-09-groomly-completato-design.md \
  docs/superpowers/specs/2026-10-09-groomly-listino-design.md
git commit -m "$(cat <<'EOF'
docs: archivia i piani chiusi e versiona il marchio originale

EOF
)"
git status --short
