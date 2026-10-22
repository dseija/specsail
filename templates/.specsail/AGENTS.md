# SpecSail project rules

This project follows the SpecSail workflow. The human is the **Captain** and is the only person who approves specs, approves acceptance tests, or merges pull requests. Agents must stop at those gates and ask the Captain to act.

## Conversational mode

When the user asks for a non-trivial change, fix, or feature, run the workflow instead of writing code immediately:

1. Read `.specsail/skills/manage/SKILL.md` and follow it.
2. If `docs/project.md`, `docs/architecture.md`, or the `Makefile` verify target are missing or unconfigured, bootstrap them with the Captain's answers first.
3. Run the stages in order and stop at each gate. Chat approvals are recorded in the artifact with the Captain's name and date.

The user does not need to run commands. `npx specsail init/new/doctor` and `.specsail/scripts/*` are optional shortcuts.

## Isolated stages and models

When the agent tool supports sub-agents or separate sessions, the First Mate runs each stage in its own session with a model chosen for that role; otherwise it adopts the stage as a role lens. State moves through the Markdown artifacts, never chat history.

The Captain chooses per-role models in `.specsail/agents.env` (`AGENT_MODEL_<STAGE>`, variants as `provider/model#variant`); empty values use the active adapter's default chain. Review must use a model family different from the implementer, or the Captain accepts the caveat recorded in `review.md`.

## Crew and skills

| Skill | Development role | Crew alias | Purpose |
|---|---|---|---|
| `manage` | Orchestrator | First Mate | Runs the workflow, bootstraps the project, sequences stages and gates. |
| `understand` | Product Owner | Scout | Turns the request into `request.md`. |
| `plan` | Tech Lead | Navigator | Writes `spec.md`, then `plan.md` and `tasks.md`. |
| `acceptance-tests` | QA | Quartermaster | Writes failing acceptance tests from approved criteria. |
| `implement` | Developer | Hands | Implements one planned task. |
| `review` | Reviewer | Bosun | Reviews independently with evidence. |
| `ship` | Release | Clerk | Updates docs, changelog, and opens the PR. |

The Captain is a human, not an agent. If an agent tool cannot load skills automatically, tell it to read `.specsail/skills/<skill>/SKILL.md` directly.

## Workflow

`request → approved spec → plan → approved acceptance tests (per phase) → implement one task → review → ship`

- Read `docs/project.md` and `docs/architecture.md` before scoping project work. Add module documentation under `docs/architecture/` when needed.
- Feature artifacts live in `specs/<feature>/`; templates are in `.specsail/templates/specs/_templates/`.
- Protected files are approved `spec.md`, `plan.md`, and `tests/acceptance/**`. Only the owning stage may edit them; commits use `spec:`, `plan:`, or `accept:` prefixes.
- If the request/spec is ambiguous or an acceptance criterion is unworkable, write `specs/<feature>/blocked.md` and stop. Never silently reinterpret an approved spec or weaken a test.
- Implement one planned task at a time. Do not broaden scope. Run `make verify` before marking a task `DEV_DONE`.
- Review is independent of implementation and reports evidence; it does not fix code. The Captain merges.
- Update docs in the same PR as the code change.

See `.specsail/docs/workflow.md` for stage definitions and `.specsail/docs/runbook.md` for operating steps.
