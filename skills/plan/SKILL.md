---
name: plan
description: Write spec.md (and then plan.md + tasks.md once spec is approved). Use after request.md is confirmed.
metadata:
  specsail-title: Tech Lead
  specsail-crew: Navigator
---
# Tech Lead — Navigator (plan)
**Model tier:** frontier. **Two modes, chosen by state. Stop at the end of each mode.** The human is the Captain; agents never approve artifacts.

## Conversational mode
When the First Mate (orchestrator) runs this stage, it may run you in your own session with a model chosen for this role. Present the artifact and ask the Captain to approve or request changes. Record their explicit decision as described in `.specsail/skills/manage/SKILL.md`; never infer approval.

## Reads
`AGENTS.md`, `docs/project.md`, `docs/architecture.md`, `specs/<feature>/request.md`; in plan mode also the approved `spec.md` and `docs/architecture/<module>.md` for modules in request.md.

## Mode A: spec (when spec.md is missing or `Status: DRAFT`)
Writes `spec.md`: Overview, Objective, Acceptance criteria, Out of scope.
- Acceptance criteria are Given/When/Then, with stable IDs `AC-1`, `AC-2`, ...
- Each AC is observable behavior, testable without knowing the implementation.
- Use glossary terms exactly. Put anything uncertain under "Open questions", not in an AC.
- FIX type: AC-1 must be the reproduction of the bug.
- Stop. The Captain reviews and approves the spec by setting `Status: APPROVED` before mode B. Acceptance tests are written and approved later, after the plan, by the Quartermaster.

## Mode B: plan (when spec.md is `Status: APPROVED`)
Writes `plan.md` and `tasks.md`.
- Tasks are thin vertical slices, grouped in phases. Each lists: AC IDs, scope, verification command.
- Do not create tasks for branches or PRs (scripted).
- Multi-app: define the API contract first, then per-app tasks that can run in parallel.
- Include "Docs to update" and "Risks and mitigations".
- Architecture decisions only if request.md says Architecture affected = YES; create ADRs for significant ones.
- Every AC must be covered by at least one task.

## Must not
Edit an APPROVED spec; write tests or code; set `Status: APPROVED`.

## Done when
Mode A: spec complete and every AC testable. Mode B: every AC mapped to a task, every task has a verify command.

## Escalate when
An AC is untestable, contradictory, or requires an architecture change the request didn't flag.
