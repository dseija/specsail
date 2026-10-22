#!/usr/bin/env bash
# Scaffold specs/<slug>/ from templates.
# Usage: scripts/new-feature.sh <slug> <fix|update|new>
set -euo pipefail
SLUG="${1:?usage: new-feature.sh <slug> <fix|update|new>}"
KIND="${2:?usage: new-feature.sh <slug> <fix|update|new>}"
[[ "$SLUG" =~ ^[a-z0-9]+(-[a-z0-9]+)*$ ]] || { echo "slug must be lowercase kebab-case" >&2; exit 1; }
case "$KIND" in
  fix) TYPE="FIX" ;;
  update) TYPE="FEATURE UPDATE" ;;
  new) TYPE="NEW FEATURE" ;;
  *) echo "type must be fix|update|new" >&2; exit 1 ;;
esac
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SPECSAIL_DIR="${SPECSAIL_HOME:-$(cd "$SCRIPT_DIR/.." && pwd)}"
cd "$(git rev-parse --show-toplevel)"
DIR="specs/$SLUG"
[ -e "$DIR" ] && { echo "$DIR already exists" >&2; exit 1; }
TEMPLATES="$SPECSAIL_DIR/templates/specs/_templates"
[ -d "$TEMPLATES" ] || TEMPLATES="$SPECSAIL_DIR/specs/_templates"
mkdir -p "$DIR"
for f in request spec plan tasks; do
  sed "s/{{SLUG}}/$SLUG/g; s/{{TYPE}}/$TYPE/g" "$TEMPLATES/$f.md" > "$DIR/$f.md"
done
echo "Created $DIR. Commit scaffolds with a spec: prefix. Next: ask your agent to start the SpecSail workflow for $SLUG; the First Mate will continue from the request stage."
