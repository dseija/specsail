# SpecSail workflow reference

SpecSail uses durable Markdown artifacts to carry intent between stages. The Captain is the human who owns the approval and merge gates. The First Mate (`manage`) runs the workflow conversationally; each stage is a role lens it adopts, or an isolated session with its own model when the environment supports it.

## Stages and crew

| # | Skill | Development role — crew alias | Reads | Writes |
|---|---|---|---|---|
| 0 | manage | Orchestrator — First Mate | project docs, Makefile, feature state | bootstrap docs, sequencing, gate records |
| 1 | understand | Product Owner — Scout | project, architecture, request | `request.md` |
| 2a | plan (spec mode) | Tech Lead — Navigator | project, architecture, request | `spec.md` |
| 2b | plan (plan mode) | Tech Lead — Navigator | approved spec, module docs | `plan.md`, `tasks.md` |
| 3 | acceptance-tests | QA — Quartermaster | approved spec, glossary, public interfaces | `tests/acceptance/<feature>/**` |
| 4 | implement | Developer — Hands | spec, plan, tasks, review, module docs | code, unit tests, task status |
| 5 | review | Reviewer — Bosun | spec, plan, tasks, diff, invariants | review report, task status |
| 6 | ship | Release — Clerk | spec, plan, tasks, diff | docs, changelog, PR |

The human Captain is not an agent role. The Captain approves `spec.md`, approves each phase's acceptance tests, and merges.

## Conversational operation

The Captain starts with a normal request. The First Mate checks `docs/project.md`, `docs/architecture.md`, and the `Makefile` verify target; if any are missing or still starter templates, it bootstraps them with the Captain's answers before starting the feature. It then runs the stages in order. Commands are optional.

**Recording approvals:** on explicit approval, the agent records `Status: APPROVED — Captain (chat), YYYY-MM-DD` in the artifact. The Captain's decision is the approval; the file is the evidence. Silence is not approval.

**Review independence:** the First Mate prefers a different model family for review than the implementer and records the reviewer's model and run mode in the `tasks.md` Stage runs row. A same-family fallback needs Captain consent and is always written into `review.md`, even for a clean verdict.

## Isolation and models

When the agent tool supports sub-agents or separate sessions, the First Mate runs each stage in its own session with its own model; otherwise it adopts the stage as a role lens. Either way, state travels in the artifact files: a spawned stage receives its `SKILL.md`, the artifacts it reads, the task or AC scope, and the gate question, and returns its artifact plus evidence. It never receives chat history.

The Captain chooses per-role models in `.specsail/agents.env` (`AGENT_MODEL_<STAGE>`); an empty value uses the first entry of the default chain in the active adapter guide. Variants are part of the model string (`provider/model#variant`). A chat override applies to one run and is recorded. If a model is unavailable, the First Mate falls back to the next chain entry and records the substitution.

## Change paths

| Type | Path |
|---|---|
| FIX | understand → spec with a reproduction criterion → acceptance test → implement → review → ship. Skip architecture planning unless needed. |
| FEATURE UPDATE | full flow; skip architecture decisions if `Architecture affected: NO`. |
| NEW FEATURE | full flow. |
| Trivial (typo, config, dependency bump) | Normal PR and `make verify`; no feature artifacts. |

## Human gates

1. Confirm the request and resolve or defer its open questions.
2. Approve `spec.md` before planning.
3. Approve acceptance tests for the current phase before implementation.
4. Merge only after CI, review, protected-path, and documentation checks pass.

Architecture decisions require Captain approval when architecture is affected. Agents never approve or merge.

## Task states and done

`TODO → IN_PROGRESS → DEV_DONE → DONE`; rework uses `CHANGES_REQUESTED`; an unresolved issue uses `BLOCKED` and `blocked.md`. Escalate after three review iterations.

Done means `make verify` is green, linked criteria pass, required docs are updated, and the Bosun marks the task `DONE`.

## Parallel work and review

- Define API contracts before parallel multi-app work; use one worktree per independent task/app.
- Do not parallelize tasks that touch the same module or shared task-status rows.
- CI is deterministic verification; Bosun review checks behavior and invariants; the Captain merges.
