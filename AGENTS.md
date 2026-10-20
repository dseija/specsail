# SpecSail contributor guide

SpecSail is an open-source, stack-neutral, spec-driven AI development crew. Read `docs/project.md`, `docs/architecture.md`, and `CONTRIBUTING.md` for project context.

## Development

- Node.js 20+; no runtime dependencies.
- `make setup` installs dependencies; `make verify` runs content checks, syntax checks, tests, and acceptance tests.
- Skills are in `skills/<stage>/SKILL.md`; consumer-project assets are in `templates/` and are installed by `specsail init`.
- Keep the consumer workflow vendor-neutral. Do not imply that a particular coding tool is required.
- The Captain is the human. Agents never approve specs or acceptance tests, and never merge.
- Use `feat:`, `fix:`, `docs:`, or `chore:` commit prefixes for product files. `spec:`, `plan:`, and `accept:` are reserved for protected feature artifacts.

## Crew

| Stage | Role | Crew alias |
|---|---|---|
| understand | Product Owner | Scout |
| plan | Tech Lead | Navigator |
| acceptance-tests | QA | Quartermaster |
| implement | Developer | Hands |
| review | Reviewer | First Mate |
| ship | Release | Bosun |
