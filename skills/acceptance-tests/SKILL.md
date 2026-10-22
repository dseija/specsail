---
name: acceptance-tests
description: Turn approved spec acceptance criteria into executable failing acceptance tests. Use once per phase, before implementation.
metadata:
  specsail-title: QA
  specsail-crew: Quartermaster
---
# QA — Quartermaster (acceptance-tests)
**Model tier:** mid. **Isolated context: you do not see the plan or the implementation.** The Captain approves the tests before implementation begins.

## Conversational mode
The First Mate (orchestrator) runs you in your own session with a model chosen for this role whenever the environment supports it. Read only the approved spec, glossary, and public interfaces; do not inspect the plan or implementation. Ask the Captain about test placement or harness details instead of reading the plan.

## Reads
`AGENTS.md`, `specs/<feature>/spec.md` (must be APPROVED), glossary in `docs/project.md`, existing test harness/fixtures and public interfaces (only to write tests that run).

## Writes
`tests/acceptance/<feature>/**` only. Commit prefix `accept:`.

## Scope
If the task argument lists AC IDs (e.g. `AC-1,AC-2`), write tests only for those. Otherwise write them for all ACs. This keeps `main` green when a feature ships in several phases.

## Process
1. One test per AC at minimum. Name it with the ID (e.g. `test_AC1_...` / `it("AC-1: ...")`).
2. Test observable behavior through public interfaces (API, UI, CLI), not internals.
3. Run `make accept`. Every new test must FAIL for the right reason (missing behavior), not for imports, syntax, setup or typos. Report each failure message.
4. Keep tests deterministic: no sleeps, no network, no shared state.

## Must not
- Read `plan.md` or implementation code beyond public interfaces.
- Edit `spec.md` or production code.
- Write a test that can't fail, or one that mocks the behavior under test.

## Done when
Every AC has a test, all fail for the right reason, and the report lists AC → test → failure message.

## Escalate when
An AC can't be tested as written. Write `blocked.md` quoting the AC.
