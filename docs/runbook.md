# SpecSail runbook

The generated consumer guide is `.specsail/docs/runbook.md`. This copy describes the same operating model for maintainers and anyone reviewing the methodology.

## Talk to the First Mate

In a coding agent, ask for the change in normal language: *"let's add user authentication."* The agent reads the SpecSail rules in `AGENTS.md`, starts `.specsail/skills/manage/SKILL.md`, and:

1. Checks `docs/project.md`, `docs/architecture.md`, and the `Makefile` verify target. Missing or starter content is drafted with the Captain's answers first.
2. Scaffolds `specs/<slug>/` and runs Scout, Navigator, Quartermaster, Hands, Bosun, and Clerk in order.
3. Stops at each gate: request confirmed, spec approved, tests approved, architecture approved if affected, and merge.

Commands are optional after `npx specsail init`.

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

The Captain may pause at any gate. Agents do not approve specs/tests or merge. See `docs/workflow.md` for task states, FIX routing, gates, and parallel-work rules.

## Gates and review

- **Spec:** the Captain reviews every acceptance criterion and approves before planning.
- **Tests:** the Captain checks the phase's tests fail for the right reason before implementation.
- **Review:** the First Mate asks whether to use a second session/model. If the Captain accepts same-model review, the caveat is recorded in `review.md`.
- **Merge:** the Captain checks CI, protected paths, and docs, then merges.

## Optional headless runner

The installed Bash runner at `.specsail/scripts/run-agent.sh` supports configured Claude, Codex, and OpenCode CLIs plus a custom command. Configure `.specsail/agents.env` from `.specsail/agents.env.example`. Invoke stages by name (`understand`) or alias (`scout`); the orchestrator is `manage` / `first-mate`. It requires Git and Bash; using skills interactively with any coding tool that can read Markdown does not.
