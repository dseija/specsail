# SpecSail workflow reference

## Stages and crew

| # | Stage / skill | Development role — crew alias | Reads | Writes |
|---|---|---|---|---|
| 1 | understand | Product Owner — Scout | project, architecture, request | `request.md` |
| 2a | plan (spec mode) | Tech Lead — Navigator | project, architecture, request | `spec.md` |
| 2b | plan (plan mode) | Tech Lead — Navigator | approved spec, module docs | `plan.md`, `tasks.md` |
| 3 | acceptance-tests | QA — Quartermaster | approved spec, glossary, public interfaces | `tests/acceptance/<feature>/**` |
| 4 | implement | Developer — Hands | spec, plan, tasks, review, module docs | code, unit tests, task status |
| 5 | review | Reviewer — First Mate | spec, plan, tasks, diff, invariants | review report, task status |
| 6 | ship | Release — Bosun | spec, plan, tasks, diff | docs, changelog, PR |

The Captain is the human, not an agent role. The Captain approves specs and phase acceptance tests and makes every merge decision.

## Change paths

| Type | Path |
|---|---|
| FIX | understand → spec with a reproduction criterion → acceptance test → implement → review → ship. Skip architecture planning unless needed. |
| FEATURE UPDATE | full flow; skip architecture decisions if `Architecture affected: NO`. |
| NEW FEATURE | full flow. |
| Trivial (typo, config, dependency bump) | Normal PR and `make verify`; no feature artifacts. |

## Human gates

1. Confirm the request and resolve or defer its open questions.
2. Approve `spec.md` before planning (`Status: APPROVED`).
3. Approve acceptance tests for the current phase after planning and before implementation.
4. Merge only after CI, review, protected-path, and documentation checks pass.

Architecture decisions require Captain approval when architecture is affected. Agents never approve or merge.

## Task states and done

`TODO → IN_PROGRESS → DEV_DONE → DONE`; rework uses `CHANGES_REQUESTED`; an unresolved issue uses `BLOCKED` and `blocked.md`. Escalate after three review iterations.

Done means `make verify` is green, linked criteria pass, required docs are updated, and the First Mate marks the task `DONE`.

## Parallel work and review

- Define API contracts before parallel multi-app work; use one worktree per independent task/app.
- Do not parallelize tasks that touch the same module or shared task-status rows.
- CI is deterministic verification; First Mate review checks behavior and invariants; the Captain merges.
