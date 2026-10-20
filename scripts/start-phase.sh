#!/usr/bin/env bash
# Create the branch for a phase. Usage: scripts/start-phase.sh <feature> <phase-number> [base]
set -euo pipefail
SLUG="${1:?feature}"; N="${2:?phase number}"; BASE="${3:-main}"
[[ "$SLUG" =~ ^[a-z0-9]+(-[a-z0-9]+)*$ ]] || { echo "feature slug must be lowercase kebab-case" >&2; exit 1; }
[[ "$N" =~ ^[1-9][0-9]*$ ]] || { echo "phase must be a positive integer" >&2; exit 1; }
git fetch origin "$BASE" 2>/dev/null || true
git checkout -b "$SLUG/phase-$N" "origin/$BASE" 2>/dev/null || git checkout -b "$SLUG/phase-$N" "$BASE"
echo "On branch $SLUG/phase-$N"
