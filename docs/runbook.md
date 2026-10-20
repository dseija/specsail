# SpecSail runbook

The generated consumer guide is `.specsail/docs/runbook.md`. This copy describes the same operating model for maintainers and anyone reviewing the methodology.

## Add SpecSail to a project

```sh
npx specsail init
```

Initialization preserves existing files, creates only missing project docs/Makefile/CI examples, installs the crew and helper scripts under `.specsail/`, and adds marked sections to `AGENTS.md` and `.gitignore`. Review the diff. Then complete `docs/project.md` and `docs/architecture.md`, configure each Makefile target for the project's real toolchain, replace `@OWNER` in `.github/CODEOWNERS`, and run `specsail doctor`.

## Run a feature

```sh
npx specsail new <slug> <fix|update|new>
```

1. **Scout / Product Owner:** clarify the raw request and record it in `request.md`.
2. **Navigator / Tech Lead, spec mode:** draft `spec.md`. The Captain reviews and approves it before any plan is written.
3. **Navigator / Tech Lead, plan mode:** write `plan.md` and `tasks.md` from the approved spec.
4. **Quartermaster / QA:** write executable failing tests for only the current phase's approved criteria. The Captain reviews and approves them before implementation.
5. **Hands / Developer:** implement one planned task, run `make verify`, and report any scope or spec problem instead of silently expanding the work.
6. **First Mate / Reviewer:** independently run verification and review against the spec, tests, plan, and architecture. Request changes with evidence or mark the task done.
7. **Bosun / Release:** update docs/changelog and prepare the PR. The Captain checks CI and merges.

The Captain may pause at any gate. Agents do not approve specs/tests or merge. See `docs/workflow.md` for task states, FIX routing, human gates, and parallel-work rules.

## Optional headless runner

The installed Bash runner at `.specsail/scripts/run-agent.sh` supports configured Claude, Codex, and OpenCode CLIs plus a custom command. Configure `.specsail/agents.env` from `.specsail/agents.env.example`. Invoke stages by name (`understand`) or sailing alias (`scout`). It requires Git and Bash; using skills interactively with any coding tool that can read Markdown does not.
