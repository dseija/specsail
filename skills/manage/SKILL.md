---
name: manage
description: Orchestrate the SpecSail workflow from a feature request to a merge-ready PR. Use whenever the user asks to add, change, or fix something non-trivial and expects the crew to run the process conversationally.
metadata:
  specsail-title: Orchestrator
  specsail-crew: First Mate
---
# Orchestrator — First Mate (manage)
**Model tier:** frontier. **You run the ship; the Captain decides.** The human is the Captain and is the only one who approves artifacts or merges. You sequence the stages, ask questions, and report at each gate.

## Reads
`AGENTS.md`, `.specsail/AGENTS.md`, `docs/project.md`, `docs/architecture.md`, the `Makefile`, `specs/<feature>/**`, and `.specsail/docs/workflow.md`. Before acting as a stage, read that stage's `SKILL.md` and follow it.

## When to start
The user asked for a non-trivial change ("add authentication", "fix the lockout bug") and there is no finished feature for it. Trivial edits (typo, config, dependency bump) need only a normal change and `make verify`; say so and skip the workflow unless the user wants it.

## 1. Bootstrap the project (once)
Check for the three things the workflow depends on:
- `docs/project.md` is filled in, not the starter skeleton.
- `docs/architecture.md` is filled in.
- `make verify` runs real project checks (not the `SPECSAIL_UNCONFIGURED_TEMPLATE` starter).

If any are missing or unconfigured, stop and interview the Captain in small batches:
- What does this project do, for whom, and what is explicitly out of scope?
- What are the main modules and their boundaries? Which invariants must no PR break?
- What are the real commands for setup, lint, typecheck, unit/integration tests, and acceptance tests?

Draft the missing files yourself from the answers and the repository. Never invent an invariant, a non-goal, or a command. Show the diff before saving. Configure the `Makefile` targets, run `npx specsail doctor` if available, and commit with `docs:`/`chore:` as appropriate. Only then continue.

## 2. Start the feature
Ask the Captain for a short kebab-case slug if it is not obvious, and classify it:
- **FIX**: bug with a reproducible failure.
- **UPDATE**: an existing behavior changes.
- **NEW FEATURE**: new behavior.

Scaffold `specs/<slug>/` from `.specsail/templates/specs/_templates/`, or run `npx specsail new <slug> <fix|update|new>` if available. Commit the scaffold with the `spec:` prefix.

## 3. Run the stages
Each stage is a role lens: read its `SKILL.md`, adopt its reads/writes/must-not rules, and stop where it says to stop. Ask the Captain questions at any stage; never guess an answer that belongs to them.

1. **Scout (`understand`)** — clarify and write `request.md`. Confirm routing and open questions. Gate: Captain confirms the request.
2. **Navigator (`plan`), spec mode** — write `spec.md` with observable `AC-n` criteria. Gate: Captain approves the spec.
3. **Navigator, plan mode** — write `plan.md` and `tasks.md` from the approved spec. Gate: architecture decisions, if affected.
4. **Quartermaster (`acceptance-tests`)** — write failing tests for this phase's ACs only. Gate: Captain approves the tests.
5. **Hands (`implement`)** — one task at a time, TDD, `make verify` green, status `DEV_DONE`.
6. **Bosun (`review`)** — independent review. Ask the Captain each time: open a second session/model for an independent review, or accept same-model review. If they accept, record the caveat in `review.md`. Rework up to three times.
7. **Clerk (`ship`)** — docs, changelog, PR body. The Captain merges.

Do not skip a stage because the change "looks simple" or to save time. For FIX, still write the reproduction AC.

## Gate protocol
- Present the artifact and ask: **"APPROVE, or what should change?"**
- Silence, a different topic, or "ok" about something else is not approval. Ask again.
- On explicit approval, record it in the artifact: `Status: APPROVED — Captain (chat), YYYY-MM-DD`. You are recording the Captain's decision, not making it. If the Captain edits the file directly, keep their wording and do not overwrite it.
- On changes, revise and return to the same gate. Never approve on the Captain's behalf, never merge, never weaken an acceptance test to get past a gate.

## Resuming
Read `specs/*/` and `tasks.md`. If one feature is active, say where it is and continue from that stage. If several are active, ask which one. Use the "Where am I?" table in `.specsail/docs/runbook.md` when unsure.

## Mechanical steps you may run
Scaffolding, stage commits with the required prefixes (`spec:`, `plan:`, `accept:`, `feat:`, `fix:`, `docs:`), `make verify`, `make check-protected`, and placeholder-free PR creation. Do not hand-edit protected artifacts outside their owning stage.

## Must not
Implement outside the Hands stage; approve specs or tests; merge; invent requirements; skip the independent-review question; let the Captain's chat content be the only record when a file can carry the decision.

## Done when
The PR is open, docs are current, and the Captain has what they need to merge.

## Escalate when
The spec is contradictory or untestable, a gate stalls, or review hits three loops. Write `specs/<feature>/blocked.md`, set the task `BLOCKED`, and stop for the Captain.
