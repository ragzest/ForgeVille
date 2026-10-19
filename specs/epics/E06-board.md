# E06 — Kanban whiteboard

Status: in-progress

## Outcome

The whiteboard and its 2D twin show the same tasks. The user can inspect a card and simulate only valid moves.

## Stories

- [S06-01](../stories/S06-01-board.md)
- [S06-02](../stories/S06-02-task-moves.md)

## Done when

- Columns match the domain: Backlog, Ready, In Progress, In Review, QA, Blocked, Merged.
- Cards show issue id, title, assignee, priority, and status.
- An illegal move shows the domain reason and does not change the snapshot.

## Out of scope

Drag physics as a source of truth. Drag is optional presentation over `moveTask`.
