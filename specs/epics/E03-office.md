# E03 — 3D office

Status: done

## Outcome

One compact, readable office floor plan with the seven required zones, shared cel-shaded furnishings, and characters whose pose reflects domain presence. The plan repeats on four themed floors of a small building (S03-04).

## Stories

- [S03-01](../stories/S03-01-office-shell.md)
- [S03-02](../stories/S03-02-furnishings.md)
- [S03-03](../stories/S03-03-characters.md)
- [S03-04](../stories/S03-04-themed-floors.md) — themed floors, cel-shaded look, live displays

## Done when

- A player can see reception, desks, QA, the board, a status display, a meeting area, plants, and windows without the camera starting inside geometry.
- Six to eight desks exist and are bound to agent ids from the snapshot.
- Character state changes when the scenario changes, without the mesh writing back to the store.

## Out of scope

Pointer-lock controls (E04) beyond a temporary orbit or fixed camera needed to inspect the room.
