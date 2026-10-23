#!/usr/bin/env bash
# Fail if protected files changed in a commit that isn't prefixed spec:/accept:/plan:.
# Usage: scripts/check-protected-paths.sh [base-ref]
#   Default base: origin/main, or the repository's first commit when origin/main
#   does not exist yet (fresh repositories without a remote).
# Backstop for fake prefixes: CODEOWNERS review on the same paths.
set -euo pipefail
if [ -n "${1:-}" ]; then
  BASE="$1"
else
  BASE="$(git rev-parse --verify --quiet origin/main || git rev-list --max-parents=0 HEAD)"
fi
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
