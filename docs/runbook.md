# SpecSail runbook

Step-by-step operating guide. The workflow reference in this folder (`workflow.md`) is the concise summary.

## Talk to the First Mate

In a coding agent, ask for the change in normal language: *"let's add user authentication."* The agent reads the SpecSail rules in `AGENTS.md`, starts `.specsail/skills/manage/SKILL.md`, and:

1. Checks `docs/project.md`, `docs/architecture.md`, and the `Makefile` verify target. Missing or starter content is drafted with the Captain's answers first.
2. Spawns or adopts Scout, Navigator, Quartermaster, Hands, Bosun, and Clerk in order. When the tool supports it, each stage runs in its own session with a model chosen for that role.
3. Stops at each gate: request confirmed, spec approved, tests approved, architecture approved if affected, and merge.

Commands are optional after `npx specsail init`.

## Where am I?

| What you see | Next step |
|---|---|
| No `specs/<feature>/request.md` | Scout: clarify and write the request. |
| Request written, not confirmed | Gate: ask the Captain to confirm the request. |
| Request confirmed, `spec.md` missing or `Status: DRAFT` | Navigator, spec mode. |
| `spec.md` still `Status: DRAFT` | Gate: the Captain approves the spec. |
| Spec `Status: APPROVED`, no `plan.md`/`tasks.md` | Navigator, plan mode. |
| Plan written, no phase acceptance tests | Quartermaster writes failing tests for the phase. |
| Tests written, not approved | Gate: the Captain approves the phase tests. |
| Task `TODO` or `CHANGES_REQUESTED` | Hands implements one task. |
| Task `DEV_DONE` | Bosun reviews. |
| All phase tasks `DONE` | Clerk ships docs and the PR. |
| `blocked.md` exists | Captain: resolve, descope, or stop. |

## Choose per-role models (optional)

The First Mate reads `.specsail/agents.env` when it runs a stage. Copy `.specsail/agents.env.example` to `.specsail/agents.env` (gitignored) and set `AGENT_MODEL_<STAGE>` for the roles you want to pin. A variant is part of the string, e.g. `opencode/claude-sonnet-5-5#high`. Roles left empty use the default chain from the active adapter (`.specsail/adapters/opencode/README.md` when installed). You can also override a model for one run in chat ("review on kimi k3").

## Run a feature manually (optional)

```sh
npx specsail new <slug> <fix|update|new>
```

1. **Scout / Product Owner:** clarify the raw request and record it in `request.md`.
2. **Navigator / Tech Lead, spec mode:** draft `spec.md`. The Captain approves it before any plan is written.
3. **Navigator / Tech Lead, plan mode:** write `plan.md` and `tasks.md` from the approved spec.
4. **Quartermaster / QA:** write executable failing tests for only the current phase's approved criteria. The Captain approves them before implementation.
5. **Hands / Developer:** implement one planned task, run `make verify`, and report scope or spec problems instead of silently expanding.
6. **Bosun / Reviewer:** independently run verification and review against the spec, tests, plan, and architecture.
7. **Clerk / Release:** update docs/changelog and prepare the PR. The Captain checks CI and merges.

The Captain may pause at any gate. Agents do not approve specs/tests or merge. See `workflow.md` for task states, FIX routing, gates, and parallel-work rules.

## Gates and review

- **Spec:** the Captain reviews every acceptance criterion and approves before planning.
- **Tests:** the Captain checks the phase's tests fail for the right reason before implementation.
- **Review:** the First Mate runs the review in its own session with a model family different from the implementer where possible. If only a same-family model is available, it asks the Captain and records the caveat in `review.md` (written even for a clean verdict, so the caveat always has a home).
- **Merge:** the Captain checks CI, protected paths, and docs, then merges.

## Optional headless runner

The installed Bash runner at `.specsail/scripts/run-agent.sh` supports configured Claude, Codex, and OpenCode CLIs plus a custom command. Configure `.specsail/agents.env` from `.specsail/agents.env.example`. Invoke stages by name (`understand`) or alias (`scout`); the orchestrator is `manage` / `first-mate`. It requires Git and Bash; using skills interactively with any coding tool that can read Markdown does not.

## Optional OpenCode adapter

`npx specsail init --adapter opencode` adds the crew as OpenCode agents under `.opencode/agents/specsail/`, with per-role default models and scoped permissions. Start a session with the `specsail/first-mate` agent, or set `"default_agent": "specsail/first-mate"` in your own `opencode.jsonc`. Models stay Captain-chosen through `.specsail/agents.env`; the adapter guide is `.specsail/adapters/opencode/README.md`. Maintainers can prove the adapter with `tools/smoke-opencode.sh` (it makes a few small model calls; set `SMOKE_MODEL_CHEAP`/`SMOKE_MODEL_FAST` if the default provider is unavailable).
