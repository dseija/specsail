# SpecSail runbook

Step-by-step operating guide. `.specsail/docs/workflow.md` is the concise reference.

## Start a feature

```sh
./.specsail/scripts/start-phase.sh <slug> 1
./.specsail/scripts/new-feature.sh <slug> <fix|update|new>
```

If you prefer not to create a branch yet, run only `new-feature.sh`. Trivial changes can use a normal PR and `make verify` without feature artifacts.

## Run the crew

1. **Scout / Product Owner:** `./.specsail/scripts/run-agent.sh understand <slug>`. Give it the raw request, answer its questions, and confirm the routing. Exit when the request is complete and open questions are resolved or explicitly deferred.
2. **Navigator / Tech Lead, spec mode:** run `./.specsail/scripts/run-agent.sh plan <slug>`. The Captain reviews every acceptance criterion and sets `Status: APPROVED` in `spec.md`.
3. **Navigator / Tech Lead, plan mode:** run the same command again after approval. Check every criterion maps to tasks and each task has a verification command. The Captain reviews architecture decisions when architecture is affected.
4. **Quartermaster / QA:** `./.specsail/scripts/run-agent.sh acceptance-tests <slug> "AC-1,AC-2"`. The Captain checks tests fail for the intended missing behavior and approves them before implementation.
5. **Hands / Developer:** `./.specsail/scripts/run-agent.sh implement <slug> T-1`. One task per run. Check scope and protected paths.
6. **First Mate / Reviewer:** `./.specsail/scripts/run-agent.sh review <slug> T-1`. Use a different model family than the implementer. Rework findings up to three times, then escalate.
7. **Bosun / Release:** `./.specsail/scripts/run-agent.sh ship <slug>`, then `./.specsail/scripts/open-pr.sh <slug> 1`. The Captain checks CI and merges.

For later phases, create the phase branch with `start-phase.sh <slug> <phase>`, then write and approve that phase's acceptance tests before implementation.

## Optional headless runner

The Bash runner supports configured Claude, Codex, and OpenCode CLIs, plus a custom command. Copy `.specsail/agents.env.example` to `.specsail/agents.env` to configure it. The runner is optional; any coding tool that can read the project instructions and Markdown skills can follow the workflow interactively. Keep each agent's tool permissions and writable paths minimal.

The scripts require Git and Bash (macOS, Linux, WSL, or Git Bash). The Markdown workflow and Node-based `specsail` commands do not depend on a particular application language or coding agent.
