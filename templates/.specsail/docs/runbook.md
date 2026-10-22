# SpecSail runbook

Step-by-step operating guide. `.specsail/docs/workflow.md` is the concise reference.

## Talk to the First Mate

In your coding agent, ask for the change in normal language: *"let's add user authentication"* or *"fix the login lockout bug."* The agent reads `.specsail/skills/manage/SKILL.md` and starts the workflow:

1. Checks `docs/project.md`, `docs/architecture.md`, and the `Makefile` verify target. If they are missing or still starter templates, it interviews you and drafts them.
2. Scaffolds `specs/<slug>/`, asks any questions, and runs Scout, Navigator, Quartermaster, Hands, Bosun, and Clerk in order.
3. Stops at each gate: request confirmed, spec approved, tests approved, architecture approved when affected, and merge. Approve in chat; the agent records the decision with your name and date.

Commands are optional. Use them if you prefer manual control, CI, or scripting.

## Run stages manually (optional)

```sh
./.specsail/scripts/start-phase.sh <slug> 1
./.specsail/scripts/new-feature.sh <slug> <fix|update|new>
./.specsail/scripts/run-agent.sh scout <slug>
./.specsail/scripts/run-agent.sh navigator <slug>
./.specsail/scripts/run-agent.sh quartermaster <slug> "AC-1,AC-2"
./.specsail/scripts/run-agent.sh hands <slug> T-1
./.specsail/scripts/run-agent.sh bosun <slug> T-1
./.specsail/scripts/run-agent.sh clerk <slug>
./.specsail/scripts/open-pr.sh <slug> 1
```

Stage names also work: `understand`, `plan`, `acceptance-tests`, `implement`, `review`, `ship`. The orchestrator is `manage` / `first-mate`.

## Gates and review

- **Spec:** the Captain reviews every acceptance criterion and approves before planning.
- **Tests:** the Captain checks the phase's tests fail for the right reason before implementation.
- **Review:** the First Mate asks whether to use a second session/model. If you accept same-model review, the caveat is recorded in `review.md`.
- **Merge:** the Captain checks CI, protected paths, and docs, then merges.

For later phases, create the phase branch with `start-phase.sh <slug> <phase>`, then write and approve that phase's acceptance tests before implementation.

## Optional headless runner

The Bash runner supports configured Claude, Codex, and OpenCode CLIs, plus a custom command. Copy `.specsail/agents.env.example` to `.specsail/agents.env` to configure it. The runner is optional; any coding tool that can read the project instructions and Markdown skills can follow the workflow interactively. Keep each agent's tool permissions and writable paths minimal.

The scripts require Git and Bash (macOS, Linux, WSL, or Git Bash). The Markdown workflow and Node-based `specsail` commands do not depend on a particular application language or coding agent.
