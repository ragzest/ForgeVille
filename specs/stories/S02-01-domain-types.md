# S02-01 — Domain types and snapshot

Status: todo
Epic: [E02](../epics/E02-domain.md)
Depends on: S01-01

## Story

As a developer, I want one typed snapshot of the company so every later view shares names and ids.

## Acceptance criteria

- `src/domain` exports types for project, agent, task, session, pull request, test run, review report, event, and workflow snapshot.
- Task columns are exactly: `backlog`, `ready`, `in_progress`, `in_review`, `qa`, `blocked`, `merged`.
- Agent runtime and model are labels, not live client handles.
- Session transcript lines have timestamp, stream (`stdout` or `system`), and text.
- Events have id, timestamp, type, message, and links to related ids.
- `WorkflowPort` and `CommandResult` live in `src/services/ports.ts` and match `architecture.md`.
- A type-level or unit test builds a minimal valid snapshot fixture.

## Verification

- `npm test` includes the fixture test.
- `npm run typecheck`

## Out of scope

Transition functions, React, and seed content beyond the fixture.
