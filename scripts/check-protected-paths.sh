#!/usr/bin/env bash
# Fail if protected files changed in a commit that isn't prefixed spec:/accept:/plan:.
# Usage: scripts/check-protected-paths.sh [base-ref]   (default origin/main)
# Backstop for fake prefixes: CODEOWNERS review on the same paths.
set -euo pipefail
BASE="${1:-origin/main}"
PROTECTED='^(tests/acceptance/|specs/[^/]+/(spec|plan)\.md$)'
ALLOWED='^(spec|accept|plan)(\(.+\))?!?:'
fail=0
for c in $(git rev-list --no-merges "$BASE"..HEAD); do
  subj="$(git log -1 --format=%s "$c")"
  hits="$(git diff-tree --no-commit-id --name-only -r "$c" | grep -E "$PROTECTED" || true)"
  if [ -n "$hits" ] && ! printf '%s' "$subj" | grep -Eq "$ALLOWED"; then
    echo "Protected paths changed in ${c:0:8} ('$subj'):"
    printf '%s\n' "$hits" | sed 's/^/  /'
    fail=1
  fi
done
[ "$fail" -eq 0 ] && echo "Protected paths OK"
exit "$fail"
