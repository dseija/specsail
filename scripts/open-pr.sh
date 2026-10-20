#!/usr/bin/env bash
# Verify, then open the PR for a phase. Usage: scripts/open-pr.sh <feature> <phase-number>
set -euo pipefail
SLUG="${1:?feature}"; N="${2:?phase number}"
[[ "$SLUG" =~ ^[a-z0-9]+(-[a-z0-9]+)*$ ]] || { echo "feature slug must be lowercase kebab-case" >&2; exit 1; }
[[ "$N" =~ ^[1-9][0-9]*$ ]] || { echo "phase must be a positive integer" >&2; exit 1; }
cd "$(git rev-parse --show-toplevel)"
make verify
BODY="Spec: specs/$SLUG/spec.md
Plan: specs/$SLUG/plan.md (phase $N)

Task status:
$(cat "specs/$SLUG/tasks.md")"
git push -u origin HEAD
gh pr create --title "$SLUG: phase $N" --body "$BODY"
