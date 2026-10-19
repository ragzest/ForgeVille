# S06-01 — Board from snapshot

Status: done
Epic: [E06](../epics/E06-board.md)
Depends on: S04-02, S02-05

## Story

As a user, I want the whiteboard and the 2D board to show the same cards so I can trust either view.

## Acceptance criteria

- Columns: Backlog, Ready, In Progress, In Review, QA, Blocked, Merged.
- Cards show issue id, title, assignee, priority, and status.
- Both views read the store. Moving data in a test updates both representations of the view model.
- The in-world whiteboard already paints sticky notes from `boardColumns` (S03-04), up to four cards per column plus "+N more". The overlay must use the same `boardColumns` view model and the same column colours (`COLUMN_NOTE`), so the wall and the panel cannot disagree.
- Interacting with the whiteboard, or choosing the board in the 2D view, opens the overlay. Cards there are sticker-style notes with an issue id, title, assignee, priority, and status in text.
- Empty columns show an empty state, not a blank gap with no label.

## Verification

- Component test with a two-task snapshot.

## Out of scope

Drag and drop. Selection may open a read-only detail until S06-02.
