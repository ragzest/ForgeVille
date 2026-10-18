# S04-03 — Overview, zone travel, and 2D alternative

Status: done
Epic: [E04](../epics/E04-navigation.md)
Depends on: S04-01, S03-01

## Story

As a user, I want a top-down overview, zone jumps, and a 2D alternative so I can inspect the company without mastering pointer lock.

## Acceptance criteria

- A control toggles a top-down camera of the whole floor. Movement keys are disabled in overview, or overview is look-only. Document the choice in the control hint.
- A zone list moves the player to each zone anchor: reception, desks, QA, board, status, meeting.
- A 2D alternative lists zones, agents, and a placeholder task list fed by the snapshot. It is usable when WebGL failed and when the user chooses it.
- Keyboard users can reach overview, zone buttons, and the 2D toggle without pointer lock.
- Narrow viewports stack the 2D alternative under the toolbar instead of overflowing off screen.

## Verification

- Component test: zone button sets the selected zone.
- Manual: resize below 800px and confirm the toolbar is reachable.

## Out of scope

Full Kanban interactions. The task list may be read-only until E06.
