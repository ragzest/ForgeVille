# S03-01 — Lit office shell and zone layout

Status: done
Epic: [E03](../epics/E03-office.md)
Depends on: S01-02, S02-05

## Story

As a visitor, I want a warm, readable room with named zones so later desks and signs have a place to live.

## Acceptance criteria

- Add `three`, `@react-three/fiber`, and `@react-three/drei` only.
- Canvas fills the main region and uses the forest, ivory, and charcoal palette from `design.md`.
- Soft ambient and directional light. Contact shadows or a cheap shadow map are acceptable. No bloom-heavy post stack.
- Floor plan reserves space for all seven zone ids in `design.md`. Zone anchors are data, not magic numbers scattered in interactables.
- A temporary fixed or orbit camera can frame the whole floor until E04.
- Window, wall, and floor materials are shared.
- Loading state clears only after the canvas has mounted, with the S01-02 error path still available.

## Verification

- Manual: `npm run dev` and confirm the room is visible.
- Automated: a component test can mock WebGL if already set up; otherwise record the manual check in the PR notes for this story. Do not block the story on a pixel snapshot.

## Out of scope

Characters, keyboard movement, panel content.
