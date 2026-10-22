# SpecSail roadmap

The first release focuses on a safe, readable baseline. The items below are ordered by the evidence and safety they unlock; they are proposals, not promises.

## Before calling the workflow stable (1.0)

1. **Run cross-stack pilots.** Complete at least two real feature cycles in each of a JavaScript/TypeScript, Python, and Go project. Record where the human or agent had to reinterpret instructions; keep representative cases as regression/evaluation fixtures.
2. **Validate agent compatibility.** Exercise the same stages with multiple coding tools using their native instruction discovery and with manual `AGENTS.md`/`SKILL.md` references. Publish a tested matrix; distinguish tested tools from tools that should work by convention.
3. **Harden initialization.** Add a dry-run mode and explicit conflict report; test interrupted initialization, existing agent instructions, symlinked paths, and Windows filesystem behavior.
4. **Prove the gates.** Add evaluation cases where agents encounter ambiguous specs, failing tests, scope changes, and the Captain approval gates; verify they stop instead of guessing, weakening tests, or merging.
5. **Document release/support policy.** Use pilot feedback to settle supported Node versions, upgrade expectations, and the optional runner's platform support before declaring 1.0 stability.

## Later, based on user demand

- Add a conflict-aware `specsail update` that previews changes and never overwrites local edits.
- Add opt-in agent-specific adapters or commands only when they improve the universal Markdown workflow without making them mandatory.
- Consider a Windows-native runner if users need headless execution outside WSL or Git Bash.
- Consider language/framework presets as separately maintained opt-ins; the core remains stack-neutral.
