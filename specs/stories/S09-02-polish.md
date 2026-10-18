# S09-02 — Visual polish, reduced motion, empty states

Status: todo
Epic: [E09](../epics/E09-vertical-slice.md)
Depends on: S09-01

## Story

As a visitor, I want the office and panels to feel finished so the prototype is pleasant to show.

## Acceptance criteria

- Palette matches `design.md` closely enough that primary surfaces are forest or emerald, success is mint, and panels read as layered glass.
- Lighting is soft. Decor is restrained. There is no neon-heavy bloom and no empty grey void around the floor.
- Reduced-motion preference disables looping character and prop animation.
- Loading, WebGL error, empty transcript, empty column, and refused-action states all have designed copy.
- Browser console has no uncaught errors during a manual pass of walk, desk, board, QA, and scenario switch.
- Major text meets contrast against its panel background. Status is not color-only.

## Verification

- Manual pass recorded in the story PR or a short `specs/verification.md` note if the team is not using PRs yet.
- `npm run typecheck`, `npm run lint`, `npm test`.

## Out of scope

New features, new zones, asset store purchases.
