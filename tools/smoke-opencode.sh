#!/usr/bin/env bash
# Maintainer smoke test: prove the OpenCode adapter loads, enforces permissions,
# spawns subagents, runs every role on its default model, and falls back when a
# model is unavailable. It makes a dozen small real model calls; not run in CI.
# Usage: tools/smoke-opencode.sh [--keep]
# Override models with SMOKE_MODEL_CHEAP / SMOKE_MODEL_FAST when the default
# provider is unavailable (for example: opencode-go/claude-haiku-5-5).
# Requires: the opencode CLI with configured providers, node, and bash.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
WORK="$(mktemp -d "${TMPDIR:-/tmp}/specsail-smoke.XXXXXX")"
KEEP=0
[[ "${1:-}" == "--keep" ]] && KEEP=1

cleanup() {
  if [[ "$KEEP" == 1 ]]; then
    echo "Kept the smoke project at $WORK"
  else
    rm -rf "$WORK"
  fi
}
trap cleanup EXIT

fail() { echo "✗ $1" >&2; exit 1; }
pass() { echo "✓ $1"; }

command -v opencode >/dev/null 2>&1 || fail "the opencode CLI is not installed"
command -v node >/dev/null 2>&1 || fail "node is not installed"

cd "$WORK"
node "$REPO_ROOT/bin/specsail.js" init --adapter opencode >/dev/null
printf 'verify:\n\t@true\n' > Makefile

CHEAP="${SMOKE_MODEL_CHEAP:-opencode-go/claude-haiku-5-5}"
FAST="${SMOKE_MODEL_FAST:-opencode-go/gpt-6-luna}"
COMMON=(--standalone --format json --auto)

run_agent() {
  opencode run "${COMMON[@]}" --agent "$1" --model "$2" "$3"
}

# 1. Agent discovery, frontmatter validity, and model resolution.
out="$(run_agent specsail/clerk "$CHEAP" "Reply with exactly: READY")" || fail "specsail/clerk failed to run"
[[ "$out" == *"READY"* ]] || fail "specsail/clerk did not reply READY"
pass "agent discovery and model resolution (specsail/clerk on $CHEAP)"

# 2. Permission deny: QA may not write a protected spec.
run_agent specsail/quartermaster "$CHEAP" "Use the write tool to create specs/probe/spec.md containing the word denied. Then reply DONE." >/dev/null 2>&1 || true
[[ ! -e specs/probe/spec.md ]] || fail "specsail/quartermaster wrote a protected artifact; permission deny is not enforced"
pass "permission deny (quartermaster cannot write specs/)"

# 3. Permission allow: Hands may write source code.
run_agent specsail/hands "$CHEAP" "Use the write tool to create src/probe.txt containing the word ok. Then reply DONE." >/dev/null 2>&1 || true
[[ -e src/probe.txt ]] || fail "specsail/hands could not write src/probe.txt; permission allow is not working"
pass "permission allow (hands writes src/)"

# 4. Spawn chain: the First Mate may launch a crew subagent and relay its answer.
out="$(run_agent specsail/first-mate "$FAST" "Use the subagent tool to launch the agent specsail/clerk with the model $CHEAP and the prompt: Reply with exactly SPAWNED. Then reply with its exact answer.")" || fail "specsail/first-mate could not spawn a crew subagent"
[[ "$out" == *"SPAWNED"* ]] || fail "the spawned specsail/clerk did not reply SPAWNED"
pass "subagent spawn (specsail/first-mate -> specsail/clerk)"

# 5. Every crew agent loads and runs. Subagents use the model configured in
# their file; the primary (first-mate) uses the session's model instead.
for role in first-mate scout navigator quartermaster hands bosun clerk; do
  out="$(opencode run --standalone --format json --auto --agent "specsail/$role" "This is a connectivity probe. Do not use any tools. Reply with exactly: READY")" \
    || fail "specsail/$role failed to run on its configured model"
  [[ "$out" == *"READY"* ]] || fail "specsail/$role did not reply READY"
  pass "agent runs (specsail/$role)"
done

# 6. An unavailable model fails detectably, so the First Mate can fall back.
if opencode run "${COMMON[@]}" --agent specsail/clerk --model opencode/specsail-nonexistent-model "Reply with exactly: READY" >/dev/null 2>&1; then
  fail "an unavailable model did not fail"
fi
pass "unavailable model fails detectably"

# 7. Fallback path: after a failed spawn on one model, the next model works.
out="$(run_agent specsail/first-mate "$FAST" "First, use the subagent tool to launch specsail/clerk with model opencode/specsail-nonexistent-model and the prompt: Reply with exactly TRIED. It will fail. Then use the subagent tool to launch specsail/clerk again with model $CHEAP and the prompt: Reply with exactly FALLBACK-OK. Reply with the second result.")" \
  || fail "specsail/first-mate could not retry a spawn after a failed model"
[[ "$out" == *"FALLBACK-OK"* ]] || fail "specsail/first-mate did not recover with the next model after a failed spawn"
pass "spawn fallback (unavailable model -> next model)"

echo "OpenCode adapter smoke test passed."
