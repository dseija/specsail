# Contributing to SpecSail

Thanks for helping improve SpecSail. Keep the methodology human-led, evidence-based, and usable across stacks and coding tools.

## Before you start

- Search existing issues before opening a new one.
- For a behavior change, describe the user outcome and acceptance criteria first. For a small typo or documentation fix, a direct pull request is fine.
- Do not add a framework, agent vendor, or project-stack assumption to the core workflow without a clear compatibility reason.

## Local checks

Requirements: Node.js 20+ and npm. This repository has no runtime dependencies.

```sh
make setup
make verify
```

The CLI tests use temporary directories and should not modify the working tree.

## Pull requests

- Keep changes focused and explain the user-facing effect.
- Update the README or docs when the workflow or CLI behavior changes.
- Add tests for observable CLI behavior; do not loosen an existing check to make a change pass.
- Use `feat:`, `fix:`, `docs:`, or `chore:` commit prefixes. Reserve `spec:`, `plan:`, and `accept:` for their corresponding protected artifacts.
- A human maintainer reviews and merges every pull request.

## Releasing

Releases are maintainer-only and use npm trusted publishing from GitHub Actions. Do not add npm tokens to the repository. See [docs/releasing.md](docs/releasing.md).

## Roles and safety

SpecSail's named crew are workflow roles, not permissions. The Captain is human. Automated agents must not approve protected artifacts, weaken acceptance tests, or merge pull requests.
