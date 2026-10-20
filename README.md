# SpecSail

**A spec-driven AI development crew.**

> **Navigate by spec. Deliver with confidence.**

SpecSail gives developers a repeatable, human-led way to work with AI coding agents: capture the request, approve the spec, plan the work, approve tests, implement one task at a time, review independently, and ship. The durable artifacts live in your repository—not in chat history.

## The crew

| Stage | Development role | Sailing alias | Responsibility |
|---|---|---|---|
| Understand | Product Owner | **Scout** | Clarifies the request and records routing, constraints, and open questions. |
| Plan | Tech Lead | **Navigator** | Writes the spec, then the technical plan and thin tasks. |
| Acceptance tests | QA | **Quartermaster** | Encodes approved criteria as observable tests before implementation. |
| Implement | Developer | **Hands** | Implements one planned task and runs project verification. |
| Review | Reviewer | **First Mate** | Independently checks behavior, evidence, scope, and invariants. |
| Ship | Release | **Bosun** | Updates release docs and prepares the pull request. |

The **Captain is always human**: the Captain resolves questions, approves the spec, approves phase acceptance tests, and merges. Agents can prepare a gate; they cannot pass it.

## Quick start

Requires Node.js 20+ for the CLI. No runtime dependencies.

```sh
npx specsail init
npx specsail doctor
npx specsail new password-reset new
```

`init` adds the kit without replacing existing project files. It installs skills and scripts under `.specsail/`, adds a marked section to `AGENTS.md`, and creates project templates only when the destination does not already exist. It writes the installed version to `.specsail.json`.

Then fill in `docs/project.md` and `docs/architecture.md`, configure the generated `Makefile` targets for your stack, and add your Captain/team to `.github/CODEOWNERS`. Start the crew by reading `.specsail/docs/runbook.md`.

### Use with your coding tool

SpecSail does not require a vendor-specific agent integration. Use any coding tool that can read repository instructions and Markdown files; follow the stage's `SKILL.md` directly if your tool does not discover skills automatically. The optional Bash headless runner supports Claude, Codex, and OpenCode CLIs, but it is not required.

For tools using the Agent Skills convention, you can also install a skill from this repository, for example:

```sh
npx skills add dseija/specsail --skill understand
```

## The flow

```text
request → Captain-approved spec → plan → Captain-approved phase tests
       → implement one task → independent review → PR → Captain merges
```

The plan is approved before acceptance tests are written. Tests are approved per phase before implementation starts. Bug fixes can use a shorter path; trivial changes can use a normal PR and the project's `make verify`.

## Commands

| Command | Purpose |
|---|---|
| `specsail init` | Add SpecSail files without overwriting existing project files. |
| `specsail new <slug> <fix\|update\|new>` | Scaffold request, spec, plan, and task artifacts. |
| `specsail doctor` | Check required files, role skills, and `make verify`. |
| `specsail --version` | Print the installed version. |

Optional scripts in `.specsail/scripts/` create phase branches, run configured CLIs, check protected-path commit prefixes, and open a PR. They require Git and Bash (macOS, Linux, WSL, or Git Bash). Interactive workflow use does not.

## Stack-neutral by design

SpecSail does not select a language, framework, CI provider, test runner, or model. The project owner wires `make setup`, `make lint`, `make typecheck`, `make test`, and `make accept` to the real project. The generated targets fail loudly until configured; they do not pretend generic checks are sufficient.

## Development

```sh
make setup
make verify
```

Read [CONTRIBUTING.md](CONTRIBUTING.md), the [workflow reference](docs/workflow.md), the [runbook](docs/runbook.md), and the [roadmap](ROADMAP.md).

## Open source

MIT licensed. Contributions and issue reports are welcome. See [CHANGELOG.md](CHANGELOG.md) for release notes.
