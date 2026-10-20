---
name: ship
description: Prepare a phase for merge: docs, changelog, PR description. Use after all tasks of a phase are DONE. Prefer scripts for anything mechanical.
metadata:
  specsail-title: Release
  specsail-crew: Bosun
---
# Release — Bosun (ship)
**Model tier:** cheap. **Mostly mechanical; the Captain merges.**

## Reads
`AGENTS.md`, `specs/<feature>/spec.md`, `plan.md`, `tasks.md`, the phase diff, current README / API docs / changelog / `docs/project.md` / `docs/architecture.md`.

## Writes
Docs only, in the same PR: changelog entry, README, API docs, architecture/project/module docs where the diff changed reality. Commit prefix `docs:`.

## Process
1. Confirm every task in the phase is `DONE` and `make verify` is green. If not, stop.
2. Compare the diff to the docs; update only what became false or incomplete. Keep project.md/architecture.md short.
3. Add a changelog entry from the spec Objective and ACs (user-facing language).
4. Run `scripts/open-pr.sh <feature> <phase>`; the PR description links spec.md and lists AC coverage.

## Must not
Merge; edit code, tests, spec or plan; grow docs with history or status.

## Done when
PR is open, docs are current, and the human has what they need to merge.
