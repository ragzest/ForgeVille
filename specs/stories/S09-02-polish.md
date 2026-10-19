# S09-02 — Visual polish, reduced motion, empty states

Status: todo
Epic: [E09](../epics/E09-vertical-slice.md)
Depends on: S09-01

## Story

As a visitor, I want the office and panels to feel finished so the prototype is pleasant to show.

## Acceptance criteria

- Each floor matches its theme in `design.md`, and the page chrome follows the floor accent. Status colours are the same on every floor.
- Every solid has its ink outline and toon shading; no stray `MeshStandardMaterial` is left in the scene.
- Lighting is soft. Decor is restrained. There is no neon-heavy bloom, and there is sky, ground, and city beyond every window.
- Accent text meets 4.5:1 on all four floors (already unit-tested in `themes.test.ts`). Panel text meets 4.5:1 on paper.
- Reduced-motion preference disables looping character and prop animation.
- Loading, WebGL error, empty transcript, empty column, and refused-action states all have designed copy.
- Browser console has no uncaught errors during a manual pass of walk, desk, board, QA, scenario switch, and a ride to every floor.
- Major text meets contrast against its panel background. Status is not color-only.

## Verification

- Manual pass recorded in the story PR description (the team uses PRs, so no `specs/verification.md` is needed).
- `npm run typecheck`, `npm run lint`, `npm test`.

## Out of scope

New features, new zones, asset store purchases.
