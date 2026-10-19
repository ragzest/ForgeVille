# S06-02 — Inspect and simulate valid moves

Status: done
Epic: [E06](../epics/E06-board.md)
Depends on: S06-01, S02-02

## Story

As a user, I want to inspect a task and simulate a legal move so I can follow the workflow without learning hidden rules.

## Acceptance criteria

- Task detail shows description, dependencies, assignee, column, and linked pull request if any.
- The UI offers only legal next columns, plus a way to attempt a blocked demonstration if useful. Illegal choices are disabled or rejected with the domain reason.
- A successful move updates the board, desk presence, the whiteboard texture, the desk monitor banner, and any open task detail together.
- The selected task (`selectedTaskId`) is outlined on the whiteboard texture as well as in the overlay.
- Dependencies are visible. The mock data must include at least one dependency. The move rules do not need a new dependency engine beyond what E02 specified. If a move is refused because of a dependency, that rule must be added to domain tests in this story rather than only in the component.

## Verification

- Component test: legal move changes column; illegal move shows the reason.

## Out of scope

Free-form editing of task titles.
