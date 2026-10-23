# SpecSail

**A spec-driven AI development crew.**

> **Navigate by spec. Deliver with confidence.**

SpecSail gives developers a repeatable, human-led way to work with AI coding agents: capture the request, approve the spec, plan the work, approve tests, implement one task at a time, review independently, and ship. The durable artifacts live in your repository — not in chat history.

Start with one sentence. Your agent runs the workflow.

## The crew

| Skill | Development role | Sailing alias | Responsibility |
|---|---|---|---|
| `manage` | Orchestrator | **First Mate** | Bootstraps project context, runs the workflow, and stops at every gate. |
| `understand` | Product Owner | **Scout** | Clarifies the request and records routing, constraints, and open questions. |
| `plan` | Tech Lead | **Navigator** | Writes the spec, then the technical plan and thin tasks. |
| `acceptance-tests` | QA | **Quartermaster** | Encodes approved criteria as observable tests before implementation. |
| `implement` | Developer | **Hands** | Implements one planned task and runs project verification. |
| `review` | Reviewer | **Bosun** | Independently checks behavior, evidence, scope, and invariants. |
| `ship` | Release | **Clerk** | Updates release docs and prepares the pull request. |

The **Captain is always human**: the Captain resolves questions, approves the spec, approves phase acceptance tests, and merges. Agents can prepare a gate; they cannot pass it.

## Quick start

Requires Node.js 20+ for the one-time setup. No runtime dependencies.

```sh
npx specsail init
```

Then open your coding agent and ask for what you want:

> "Let's add user authentication."

The First Mate checks `docs/project.md`, `docs/architecture.md`, and the `Makefile`. If they are missing or still starter templates, it interviews you and drafts them. It then scaffolds `specs/<feature>/` and runs Scout → Navigator → Quartermaster → Hands → Bosun → Clerk, asking questions and stopping at each approval gate. You answer in chat; the agent records each decision in the artifact.

No commands are required after `init`. The CLI stays available for manual control, CI, and scripting.

## How the flow works

```text
request → Captain-approved spec → plan → Captain-approved phase tests
       → implement one task → independent review → PR → Captain merges
```

The spec is approved before planning; phase tests are approved before implementation. Bug fixes use a shorter path; trivial changes can use a normal PR and the project's `make verify`.

At every stage the agent may ask you questions. Two gates are always explicit:

1. **Spec approval** — the acceptance criteria are observable and complete.
2. **Test approval** — the tests fail for the right reason before code is written.

Review independence is also explicit: the First Mate uses a different model family than the implementer where possible. If you accept a same-family review, the caveat is recorded in `review.md`.

## Isolated stages and per-role models

When your tool supports sub-agents, the First Mate runs each stage in its own session with its own model, so Scout never sees the plan, Quartermaster never sees the implementation, and Bosun never shares context with Hands. State moves only through the Markdown artifacts.

The Captain chooses the model for every role in `.specsail/agents.env` (`AGENT_MODEL_UNDERSTAND=...`, variants as `provider/model#variant`). Empty roles use the adapter's default chain, and you can still override a role for one run in chat.

For OpenCode, install the ready-made crew agents:

```sh
npx specsail init --adapter opencode
```

This adds `specsail/*` agents under `.opencode/agents/specsail/` with per-role default models and scoped permissions (Bosun can only write its report and the task status, Hands cannot touch protected artifacts, Quartermaster can only write acceptance tests).

## Use with your coding tool

SpecSail does not require a vendor-specific agent integration. Use any tool that reads repository instructions and Markdown — OpenCode, Claude Code, Codex, Cursor, Copilot, Gemini CLI, or anything else. `AGENTS.md` tells the agent to start the workflow; if your tool does not discover skills automatically, it can read the `SKILL.md` files directly.

For tools using the Agent Skills convention, you can also install individual skills from this repository:

```sh
npx skills add dseija/specsail --skill manage
```

## Commands (optional)

| Command | Purpose |
|---|---|
| `specsail init [--adapter opencode]` | Add SpecSail files without overwriting existing project files; `--adapter` also installs OpenCode crew agents. |
| `specsail update [--dry-run] [--force]` | Upgrade installed SpecSail files to the CLI's version. Untouched kit files are updated; local edits are reported and kept unless you pass `--force`. |
| `specsail new <slug> <fix\|update\|new>` | Scaffold request, spec, plan, and task artifacts manually. |
| `specsail doctor` | Check required files, crew skills, `make verify`, the workflow trigger, and that installed files match this CLI version. |
| `specsail --version` | Print the installed version. |

Optional scripts in `.specsail/scripts/` create phase branches, run configured CLIs, check protected-path commit prefixes, and open a PR. They require Git and Bash (macOS, Linux, WSL, or Git Bash). The conversational workflow does not.

## Stack-neutral by design

SpecSail does not select a language, framework, CI provider, test runner, or model. The project owner wires `make setup`, `make lint`, `make typecheck`, `make test`, and `make accept` to the real project. The generated targets fail loudly until configured; they do not pretend generic checks are sufficient.

## Development

```sh
make setup
make verify
```

Read [CONTRIBUTING.md](CONTRIBUTING.md), the [workflow reference](docs/workflow.md), the [runbook](docs/runbook.md), the [release guide](docs/releasing.md), and the [roadmap](ROADMAP.md).

## Open source

MIT licensed. Contributions and issue reports are welcome. See [CHANGELOG.md](CHANGELOG.md) for release notes.
