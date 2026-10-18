# S04-01 — Walk, look, run, pointer lock

Status: done
Epic: [E04](../epics/E04-navigation.md)
Depends on: S03-01

## Story

As a player, I want to walk the office with familiar controls so I can approach the work instead of only orbiting a model.

## Acceptance criteria

- WASD and arrow keys move on the floor plane.
- Shift runs.
- Pointer lock on canvas click. Mouse look while locked.
- Escape releases pointer lock.
- Movement stops at walls and large furniture using simple colliders. Perfect physics is not required.
- Camera height and look limits avoid flipping over.
- While `document.activeElement` is an input, textarea, or `[data-captures-keys]`, movement keys do nothing.
- Overlay buttons remain usable when the pointer is unlocked.
- Control state lives outside React render during the frame loop. Panel components do not rerender on each move. A test or comment-backed dev counter is optional; the implementation must subscribe to player position only inside the world rig.

## Verification

- Manual script: lock, walk to the board, run, Escape, focus a dummy input, press WASD, confirm the player does not move.
- Unit test the key-capture predicate.

## Out of scope

Click-to-interact. That is S04-02.
