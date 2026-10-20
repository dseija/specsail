# ADR 0001: Keep the methodology portable and the CLI dependency-free
Status: ACCEPTED
Date: 2026-10-20

## Context

SpecSail should be adoptable in projects with different application stacks and with coding tools from different vendors. A CLI can improve onboarding, but a vendor-specific runner or a language-specific build system would narrow adoption and make the methodology depend on a tool.

## Decision

Use Markdown skills and project instructions as the workflow contract; keep agent execution optional. Publish a small Node.js CLI with no runtime dependencies to install assets, scaffold artifacts, and diagnose setup. The adopting project owns its verification commands through `make verify`.

## Alternatives considered

- Require one AI CLI: rejected because this would exclude developers using other tools or interactive IDE agents.
- Ship only a copyable template: rejected because first-time setup and safe merging would remain manual.
- Build a multi-agent orchestrator: rejected because the Captain must own approvals and the stages should remain independently usable.

## Consequences

Markdown remains inspectable and usable without npm or automation. CLI asset layout and agent-specific discovery may evolve; the optional Bash runner is not promised as cross-platform. The CLI must avoid overwriting user files, and the documentation must distinguish an unconfigured verification template from a passing project check.
