# S09-04 — Operator README

Status: todo
Epic: [E09](../epics/E09-vertical-slice.md)
Depends on: S09-02, S09-03

## Story

As a new contributor, I want the README to explain setup, controls, architecture, and limits so I can run the prototype without reading the whole backlog.

## Acceptance criteria

- README replaces the planning-only intro with: what ForgeVille is, milestone limits, install, dev, test, lint, type-check, and e2e commands.
- Controls table matches the implemented keys, including the floor picker and the elevator.
- A "Building" section explains the four floors, their themes, and that floors 2–4 are vacant for now. Word this so it does not name a story id; S10-01 updates the section when it fills those floors.
- One screenshot of each floor, committed under `docs/screenshots/floors/`. The existing per-story folders in `docs/screenshots/` stay as they are.
- Architecture section points to `specs/architecture.md` and names the store as the source of truth.
- Limitations state that agents, terminals, checks, screenshots, usage, and merges are simulated.
- Recommended next milestone is one real coding-agent runtime against an isolated local workspace, with E11 still not implemented.
- `specs/roadmap.md` statuses for completed stories are updated to `done`.

## Verification

- A clean-room reading: every command in the README exists in `package.json`.

## Out of scope

Deploying the prototype.
