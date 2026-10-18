# E03 — 3D office

Status: done

## Outcome

One compact, readable office floor with the seven required zones, shared low-poly furnishings, and characters whose pose reflects domain presence.

## Stories

- [S03-01](../stories/S03-01-office-shell.md)
- [S03-02](../stories/S03-02-furnishings.md)
- [S03-03](../stories/S03-03-characters.md)

## Done when

- A player can see reception, desks, QA, the board, a status display, a meeting area, plants, and windows without the camera starting inside geometry.
- Six to eight desks exist and are bound to agent ids from the snapshot.
- Character state changes when the scenario changes, without the mesh writing back to the store.

## Out of scope

Pointer-lock controls (E04) beyond a temporary orbit or fixed camera needed to inspect the room.
