# S08-01 — Overlay metrics and event feed

Status: todo
Epic: [E08](../epics/E08-mission-control.md)
Depends on: S02-04, S02-05, S01-02

## Story

As an operator, I want a compact mission-control overlay so I can see the company without opening every desk.

## Acceptance criteria

- Overlay shows total projects, active agents, queued tasks, open PRs, blocked tasks, successful merges, recent failures, and QA pass rate.
- All values come from the metrics function. A test mutates the snapshot and expects the rendered numbers to change.
- Recent events list the newest events with timestamps and messages.
- The overlay does not cover the interact hint or the close control of an open panel. On a narrow viewport it can collapse to a summary button that expands.
- Failures and blocked counts are understandable without color alone.

## Verification

- Component test against two fixtures.

## Out of scope

Editing policy from the overlay.
