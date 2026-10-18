# S02-04 — Mission-control metrics

Status: done
Epic: [E02](../epics/E02-domain.md)
Depends on: S02-01

## Story

As an operator, I want mission-control numbers derived from the snapshot so the overlay cannot drift from the board.

## Acceptance criteria

- A pure function returns: total projects, active agents, queued tasks, open pull requests, blocked tasks, successful merges, recent failures, and QA pass rate.
- Active agents are agents whose presence is working or reviewing.
- Queued tasks are `backlog` plus `ready`.
- Open pull requests exclude merged and closed.
- Successful merges count tasks or pull requests in the merged state, not a separate hard-coded number.
- QA pass rate is passing required checks divided by completed required checks, with a defined zero-check result of `null` rather than a fake 100.
- Recent failures come from failure events, newest first, limited by an argument.
- Tests use two fixtures with different counts and assert every field.

## Verification

- `npm test` for metrics.

## Out of scope

Rendering the overlay.
