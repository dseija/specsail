# SpecSail workflow reference

SpecSail uses durable Markdown artifacts to carry intent between stages. The Captain is the human who owns the approval and merge gates. The First Mate (`manage`) runs the workflow conversationally; the other stages are role lenses it adopts.

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

The human Captain is not an agent role. Agents may prepare work for a gate, but only the Captain approves `spec.md`, approves each phase's acceptance tests, and merges.

## Conversational operation

The Captain starts with a normal request ("let's add user authentication"). The First Mate checks project context, bootstraps missing docs/Makefile settings with the Captain's answers, scaffolds the feature, then runs the stages in order. The Captain answers questions and approves artifacts in chat; commands are optional.

**Recording approvals:** on explicit approval, the agent records `Status: APPROVED — Captain (chat), YYYY-MM-DD` in the artifact. The Captain's decision is the approval; the file is the evidence. Silence is not approval.

**Review independence:** the First Mate asks the Captain whether to review in a second session/model. If the Captain accepts a same-model review, the caveat is recorded in `review.md`.

## Change paths

| Type | Path |
|---|---|
| FIX | understand → spec with a reproduction criterion → acceptance test → implement → review → ship. Skip architecture planning unless needed. |
| FEATURE UPDATE | full flow; plan skips architecture decisions if `Architecture affected: NO`. |
| NEW FEATURE | full flow. |
| Trivial (typo, config, dependency bump) | Normal PR and `make verify`; no feature artifacts. |

## Human gates

1. Confirm the request and resolve or explicitly defer open questions.
2. Review and approve `spec.md` before planning.
3. Review and approve acceptance tests for the current phase before implementation.
4. Merge only after CI is green, review is done, protected paths are clean, and docs are current.

Architecture decisions require Captain approval when the plan says architecture is affected. Merge is always a human decision.

## Task states and done

`TODO → IN_PROGRESS → DEV_DONE → DONE`; rework uses `CHANGES_REQUESTED`; an unresolved issue uses `BLOCKED` plus `blocked.md`. After three review iterations, stop and escalate to the Captain.

A task is done when `make verify` is green, linked acceptance criteria pass, required docs are updated, and the Bosun marks it `DONE`.

## Parallel work and review

- Define API contracts before parallel multi-app work; independent tasks may use separate worktrees.
- Do not parallelize tasks that touch the same module or shared task-status rows.
- CI is deterministic verification; Bosun review checks behavior and invariants; the Captain merges.
