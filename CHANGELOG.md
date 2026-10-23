# Changelog

All notable SpecSail changes are recorded here.

## Unreleased

- Add `specsail update [--dry-run] [--force] [--adapter opencode]`: upgrades kit-owned files to the CLI's version using `.specsail/manifest.json` to tell untouched files from local edits. Local edits are reported and kept (exit 1) unless `--force`; marked sections in `AGENTS.md`/`.gitignore` are refreshed; consumer-owned files are never touched.
- `specsail doctor` now reports when installed files are older than the CLI, and `specsail init` points at `specsail update` when it finds an older install.
- Extend `tools/smoke-opencode.sh` to run every crew role on its default model and to prove the unavailable-model spawn fallback.
- Keep the `## Stage runs` row as the durable run record: `review.md` is written only for requested changes or for a same-family caveat, which it always carries (`Model:`/`Run:` lines).
- Remove the example row from the `tasks.md` Stage runs template so it no longer leaks into generated PR bodies.
- `make check-protected` now falls back to the repository's first commit when `origin/main` does not exist (fresh repositories without a remote).
- Document that a primary agent's `model:` line does not override the session model in OpenCode.

## 0.3.0 — 2026-10-22

- Isolate each stage: when the agent tool supports sub-agents or separate sessions, the First Mate runs Scout, Navigator, Quartermaster, Hands, Bosun, and Clerk in their own sessions with models chosen per role. State still moves only through the Markdown artifacts.
- Let the Captain choose a model and variant for every role in `.specsail/agents.env` (`AGENT_MODEL_<STAGE>`, variants as `provider/model#variant`); empty roles use the adapter's default chain, and chat overrides apply to one run.
- Default model chains put every `opencode-go`-available model first, with `opencode` as fallback and `opencode`-only models at the end of each chain.
- Add the optional OpenCode adapter: `npx specsail init --adapter opencode` installs `specsail/*` agents under `.opencode/agents/specsail/` with per-role default models and scoped permissions (reviewer writes only its report, implementer cannot touch protected artifacts, QA writes only acceptance tests).
- Review independence is now decided by model family: the Bosun must use a family different from Hands, and a same-family fallback is recorded as a caveat in `review.md`.
- Record each stage's resolved model and run mode in a `## Stage runs` table in `tasks.md`; the Bosun also records `Model:`/`Run:` lines at the top of `review.md`.
- `specsail doctor` now validates the installed OpenCode adapter agents and the `AGENT_MODEL_*` format in `.specsail/agents.env`.
- Add `tools/smoke-opencode.sh`, a maintainer end-to-end proof of the adapter: agent discovery, scoped permission deny/allow, and subagent spawning.
- Add the "Where am I?" state-to-next-step table to the runbook and document `default_agent` setup for the OpenCode adapter.

## 0.2.1 — 2026-10-22

- Simplify the repository layout: `templates/` now mirrors the installed layout, feature templates live under `templates/specs/`, and maintainer tooling moved to `tools/`.
- Single-source the installed workflow and runbook from `docs/`; remove the duplicated template copies.
- Remove the vestigial `tests/` placeholder. No change to `npx specsail init` output or consumer paths.

## 0.2.0 — 2026-10-21

- Add conversational mode: ask your coding agent for a change and the First Mate (`manage`) runs the workflow, bootstrapping project docs and the Makefile first.
- Add the `manage` orchestrator skill; chat approvals are recorded in artifacts as `Status: APPROVED — Captain (chat), <date>`.
- Review now asks whether to use a second session/model and records any same-model caveat.
- Rename crew aliases: Reviewer is now **Bosun** and Release is now **Clerk**. Stage names and commands are unchanged.
- Publish releases from GitHub Actions with npm trusted publishing and provenance; add `make release` and the release guide.

## 0.1.0 — 2026-10-20

- First public release of the SpecSail methodology and Node.js CLI.
- Add the Captain-led crew: Scout, Navigator, Quartermaster, Hands, First Mate, and Bosun.
- Add merge-safe project initialization, feature scaffolding, and setup diagnostics.
- Include stack-neutral templates, portable Markdown skills, and optional Bash helpers.
