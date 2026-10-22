# Changelog

All notable SpecSail changes are recorded here.

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
