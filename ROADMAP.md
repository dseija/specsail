# SpecSail roadmap

Ordered by the evidence each item unlocks. Completed work rolls into `CHANGELOG.md` instead of accumulating here.

## Now

1. **`specsail update`** — upgrade `.specsail/` from the version in `.specsail.json`, with a dry-run, a conflict report, and no silent overwrites of consumer edits.
2. **Run the conversational mode in real projects.** Two feature cycles each in a JavaScript/TypeScript, Python, and Go codebase. Record every point where the human or agent had to reinterpret an instruction, and keep representative cases as evaluation fixtures.
3. **Publish a tested agent compatibility matrix.** Exercise OpenCode, Claude Code, Codex, Cursor, Copilot, and Gemini CLI against the conversational trigger and skills; distinguish tested tools from tools expected to work by convention. Exercise the OpenCode adapter end-to-end with `tools/smoke-opencode.sh` (agent load, scoped permissions, subagent spawn).

## Next (before 1.0)

4. **Prove the gates.** Add evaluation cases for ambiguous specs, wrong-reason test failures, scope creep, and Captain approvals; verify agents stop instead of guessing, weakening tests, or merging.
5. **Document support and upgrade policy.** Settle the supported Node range, the bash runner's platform matrix (macOS, Linux, WSL, Git Bash), and what consumers should expect from a minor upgrade.

## Later (demand-driven)

- Windows-native runner for headless execution outside WSL/Git Bash.
- Opt-in language/framework presets; the core stays stack-neutral.
- Headless per-role orchestration: spawn each stage in its own session and model beyond `run-agent.sh`'s single-stage runs.
- Opt-in adapters for more agent tools, using the OpenCode adapter as the pattern.
- Richer `specsail doctor` checks once `update` defines the installed-file contract.
