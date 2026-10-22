#!/usr/bin/env bash
# Bump the version, commit, and push a release tag. The tag starts the release workflow.
# Usage: tools/release.sh <x.y.z>
set -euo pipefail
VERSION="${1:?usage: release.sh <x.y.z>}"
[[ "$VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]] || { echo "version must be x.y.z (no leading v)" >&2; exit 1; }

cd "$(git rev-parse --show-toplevel)"
[ -z "$(git status --porcelain)" ] || { echo "working tree must be clean" >&2; exit 1; }
BRANCH="$(git rev-parse --abbrev-ref HEAD)"
[ "$BRANCH" = "main" ] || { echo "release from main, not $BRANCH" >&2; exit 1; }

git fetch origin main
[ "$(git rev-parse HEAD)" = "$(git rev-parse origin/main)" ] || { echo "local main must match origin/main" >&2; exit 1; }
grep -q "^## $VERSION " CHANGELOG.md || { echo "CHANGELOG.md is missing a '## $VERSION' heading" >&2; exit 1; }
git rev-parse -q --verify "refs/tags/v$VERSION" >/dev/null && { echo "tag v$VERSION already exists" >&2; exit 1; }

make verify
CURRENT="$(node -p "require('./package.json').version")"
if [ "$CURRENT" != "$VERSION" ]; then
  npm version "$VERSION" --no-git-tag-version
  git add package.json package-lock.json
  git commit -m "chore: release $VERSION"
fi
git tag "v$VERSION"
git push origin main
git push origin "v$VERSION"

echo "Pushed v$VERSION. Watch the release workflow with: gh run watch"
