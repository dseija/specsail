# SpecSail project rules

This project follows the SpecSail workflow. The human is the **Captain** and is the only person who approves specs, approves acceptance tests, or merges pull requests. Agents must stop at those gates and ask the Captain to act.

## Crew and skills

| Stage | Development role | Crew name | Skill |
|---|---|---|---|
| Understand | Product Owner | Scout | `.specsail/skills/understand/SKILL.md` |
| Plan | Tech Lead | Navigator | `.specsail/skills/plan/SKILL.md` |
| Acceptance tests | QA | Quartermaster | `.specsail/skills/acceptance-tests/SKILL.md` |
| Implement | Developer | Hands | `.specsail/skills/implement/SKILL.md` |
| Review | Reviewer | First Mate | `.specsail/skills/review/SKILL.md` |
| Ship | Release | Bosun | `.specsail/skills/ship/SKILL.md` |

Use the stage name in files and commands. The crew name is a human-friendly alias. If an agent tool cannot load skills automatically, tell it to read this file and the relevant `SKILL.md` directly.

## Workflow

`request → approved spec → plan → approved acceptance tests (per phase) → implement one task → review → ship`

- Read `docs/project.md` and `docs/architecture.md` before scoping project work. Add module documentation under `docs/architecture/` when needed.
- Feature artifacts live in `specs/<feature>/`; templates are in `.specsail/templates/specs/_templates/`.
- Protected files are approved `spec.md`, `plan.md`, and `tests/acceptance/**`. Only the owning stage may edit them; commits use `spec:`, `plan:`, or `accept:` prefixes.
- If the request/spec is ambiguous or an acceptance criterion is unworkable, write `specs/<feature>/blocked.md` and stop. Never silently reinterpret an approved spec or weaken a test.
- Implement one planned task at a time. Do not broaden scope. Run `make verify` before marking a task `DEV_DONE`.
- Review must be independent of implementation and report evidence; it does not fix code. The Captain merges.
- Update docs in the same PR as the code change.

See `.specsail/docs/workflow.md` for stage definitions and `.specsail/docs/runbook.md` for operating steps.
