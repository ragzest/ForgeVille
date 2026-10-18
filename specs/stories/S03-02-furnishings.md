# S03-02 — Desks, board, QA corner, meeting area

Status: todo
Epic: [E03](../epics/E03-office.md)
Depends on: S03-01

## Story

As a visitor, I want the office to read as a small software company at a glance, with desks, a board, a QA corner, and a meeting table.

## Acceptance criteria

- Six to eight desks, each with an agent id from the current snapshot. Extra snapshot agents do not spawn extra desks in this milestone; the seed must match the desk count.
- Desks use shared geometry. Monitors, chairs, and small props are instanced or cloned from shared geometry.
- Visible landmarks: reception counter or project plaque, Kanban whiteboard, project status display, QA test stations, meeting table, plants, windows.
- Aisles are wide enough for a capsule collider about 0.6 units in radius. Record the unit scale in a `world/layout` comment.
- Interactive object ids are stable: `desk:{agentId}`, `board`, `qa-screen`, `status-display`, `reception`.
- No downloaded asset with an unclear license. Generated geometry is the default.

## Verification

- Manual walkthrough with the temporary camera.
- Unit test: layout module lists every required zone and one desk id per seeded agent.

## Out of scope

Final materials polish (S09-02) and click behavior (S04-02).
