#!/usr/bin/env bash
# Run one stage headlessly with whichever CLI/model is configured for it.
# Usage: scripts/run-agent.sh <stage-or-crew-alias> <feature> [task-id]
# Config: .specsail/agents.env (see .specsail/agents.env.example)
set -euo pipefail
ROLE="${1:?usage: run-agent.sh <stage-or-crew-alias> <feature> [task-id]}"
FEATURE="${2:?feature slug}"
TASK="${3:-}"
[[ "$FEATURE" =~ ^[a-z0-9]+(-[a-z0-9]+)*$ ]] || { echo "feature slug must be lowercase kebab-case" >&2; exit 1; }
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SPECSAIL_DIR="${SPECSAIL_HOME:-$(cd "$SCRIPT_DIR/.." && pwd)}"
cd "$(git rev-parse --show-toplevel)"
[ -f "$SPECSAIL_DIR/agents.env" ] && . "$SPECSAIL_DIR/agents.env"

case "$ROLE" in
  understand|scout) STAGE=understand; TITLE="Product Owner"; CREW="Scout" ;;
  plan|navigator) STAGE=plan; TITLE="Tech Lead"; CREW="Navigator" ;;
  acceptance-tests|quartermaster) STAGE=acceptance-tests; TITLE="QA"; CREW="Quartermaster" ;;
  implement|hands) STAGE=implement; TITLE="Developer"; CREW="Hands" ;;
  review|first-mate) STAGE=review; TITLE="Reviewer"; CREW="First Mate" ;;
  ship|bosun) STAGE=ship; TITLE="Release"; CREW="Bosun" ;;
  *) echo "Unknown stage or crew alias '$ROLE'." >&2; exit 1 ;;
esac

SKILL="$SPECSAIL_DIR/skills/$STAGE/SKILL.md"
[ -f "$SKILL" ] || { echo "No skill for stage '$STAGE' ($SKILL)" >&2; exit 1; }

KEY="$(printf '%s' "$STAGE" | tr 'a-z-' 'A-Z_')"
CLI_VAR="AGENT_CLI_$KEY"; MODEL_VAR="AGENT_MODEL_$KEY"
CLI="${!CLI_VAR:-${AGENT_CLI:-claude}}"
MODEL="${!MODEL_VAR:-}"

PROMPT="You are the $TITLE ($CREW) agent for the $STAGE stage. Read AGENTS.md, $SPECSAIL_DIR/AGENTS.md, and $SKILL, then do your job for specs/$FEATURE/. The human is the Captain: never approve specs/tests or merge. Follow your Must-not and Escalate rules strictly."
[ -n "$TASK" ] && PROMPT="$PROMPT Task: $TASK. Work on this task only."

# NOTE: headless runs need tool permissions configured in each tool (allowed
# commands, writable paths). Keep them minimal per role.
case "$CLI" in
  claude)   exec claude -p ${MODEL:+--model "$MODEL"} "$PROMPT" ;;
  codex)    exec codex exec ${MODEL:+-m "$MODEL"} "$PROMPT" ;;
  opencode) exec opencode run ${MODEL:+-m "$MODEL"} "$PROMPT" ;;
  custom)   : "${AGENT_CUSTOM_CMD:?set AGENT_CUSTOM_CMD}"; exec $AGENT_CUSTOM_CMD "$PROMPT" ;;
  *) echo "Unsupported CLI '$CLI'. Edit scripts/run-agent.sh to add it." >&2; exit 1 ;;
esac
