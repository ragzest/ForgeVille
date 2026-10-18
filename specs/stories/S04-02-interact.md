# S04-02 — Proximity interaction and hints

Status: done
Epic: [E04](../epics/E04-navigation.md)
Depends on: S04-01, S03-02

## Story

As a player, I want a hint when I can use something, and a single interact action, so desks and the board are discoverable.

## Acceptance criteria

- The nearest interactive object within a small radius is the focus target.
- Hint text includes the object label and "E" when a target exists. No hint when nothing is nearby.
- E activates the focused target while pointer is locked, if keys are not captured.
- Click activates a target when pointer is unlocked and the click hits that object.
- Activation opens a placeholder panel with the object id, or selects it in the store for later panels. Escape closes the placeholder after pointer lock is already released. If pointer is locked, the first Escape only unlocks.
- Desk, board, QA screen, status display, and reception all respond.

## Verification

- Unit test chooses the nearest target from fixture distances.
- Manual check for hint and Escape order.

## Out of scope

Final panel fields. Do not implement merge logic here.
