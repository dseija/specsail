# SpecSail project

## What it is / who uses it

SpecSail is an open-source methodology kit for developers who use AI coding agents. It gives a human-led crew durable Markdown artifacts, role-specific instructions, explicit approval gates, and optional scripts to carry a change from request to review and release. It is intended to work with any application language and any coding tool that can read repository instructions and Markdown; it does not require an agent vendor or runtime.

Tagline: **Navigate by spec. Deliver with confidence.**

## Non-goals

- SpecSail is not an autonomous software delivery system. The human Captain owns approvals and merges.
- It does not prescribe a programming language, framework, cloud, test runner, or model provider. Optional adapters may ship editable per-role model defaults.
- The optional Bash headless runner is not a universal agent adapter.
- The CLI never overwrites local edits: `specsail update` upgrades kit-owned files with a dry-run and a conflict report, and it does not generate vendor-specific slash commands.

## Glossary

| Term | Meaning |
|---|---|
| Captain | The human who resolves questions, approves protected artifacts, and merges. |
| Crew | The orchestrator and six stage-specific agent roles, each with a sailing alias. |
| First Mate | The orchestrator (`manage`); runs the workflow conversationally under the Captain's orders. |
| Artifact | A Markdown file that carries state between stages; never chat history. |
| Spec | Captain-approved intent: objective, observable acceptance criteria, and out of scope. |
| AC | Stable acceptance criterion ID (`AC-n`) written in Given/When/Then form. |
| Phase | A group of tasks that ships as one PR while leaving the base branch green. |
| Task | A thin vertical slice linked to acceptance criteria and a verification command. |
| Protected files | Approved `spec.md`, `plan.md`, and `tests/acceptance/**`; ownership and commit prefixes guard them. |
| Manifest | `.specsail/manifest.json`: content hashes of installed kit files, which lets `specsail update` tell untouched kit files from local edits. |

## Tech stack

- Product: Node.js 20+ CLI using only Node built-ins; Bash scripts are optional helpers.
- Distribution: public npm package and GitHub repository; Markdown assets are independently readable.
- Tests: Node's built-in test runner.

## Repo map

| Path | Purpose |
|---|---|
| `bin/`, `src/` | `specsail` CLI entry point and commands. |
| `skills/` | Portable source skills: the `manage` orchestrator and the six stage roles. |
| `templates/` | Everything `init` installs: `.specsail/`, feature templates, docs skeletons, Makefile, and CI samples. Mirrors the installed layout. |
| `templates/adapters/` | Opt-in vendor agent integrations, such as the OpenCode crew agents. |
| `scripts/` | Optional Bash helpers shipped to consumer projects. |
| `tools/` | Maintainer-only validation and release tooling. |
| `docs/` | Product documentation and architecture; canonical workflow/runbook are copied into consumer projects. |

## Invariants and gotchas

- The Captain is always human; agents do not approve `spec.md`, acceptance tests, or merge PRs.
- In conversational mode, explicit chat approval is recorded by the agent as evidence; silence is never approval.
- The spec is approved before the plan; phase acceptance tests are written and approved after planning, before implementation.
- `specsail init` never overwrites existing project files; it only updates its marked section in `AGENTS.md` and `.gitignore`.
- `specsail update` overwrites a kit-owned file only when the manifest shows it is untouched (or `--force` is given); everything else is reported as kept local. It never touches consumer-owned files.
- Consumer `make verify` is intentionally unconfigured until the adopter wires their real stack checks.
- Skills retain stage names as identifiers; role titles and sailing aliases are metadata and documentation.

## Pointers

- `README.md`: getting started and product overview.
- `docs/architecture.md`: product boundaries and data flow.
- `docs/workflow.md`, `docs/runbook.md`: canonical methodology, installed as `.specsail/docs/` in consumer projects.
- `docs/releasing.md`: maintainer release procedure and npm trusted publishing setup.
- `CHANGELOG.md`: user-facing release history.
- `ROADMAP.md`: ordered follow-up validation and improvement proposals.
