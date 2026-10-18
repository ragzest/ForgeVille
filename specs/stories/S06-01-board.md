# S06-01 — Board from snapshot

Status: todo
Epic: [E06](../epics/E06-board.md)
Depends on: S04-02, S02-05

## Story

As a user, I want the whiteboard and the 2D board to show the same cards so I can trust either view.

## Acceptance criteria

- Columns: Backlog, Ready, In Progress, In Review, QA, Blocked, Merged.
- Cards show issue id, title, assignee, priority, and status.
- Both views read the store. Moving data in a test updates both representations of the view model.
- The in-world board can be a readable simplified surface plus the overlay. Do not try to fit every card on the mesh if the overlay is the readable surface. The mesh must still read as a Kanban board.
- Empty columns show an empty state, not a blank gap with no label.

## Verification

- Component test with a two-task snapshot.

## Out of scope

Drag and drop. Selection may open a read-only detail until S06-02.
