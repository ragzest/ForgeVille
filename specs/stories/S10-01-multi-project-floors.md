# S10-01 — Multi-project floors

Status: todo
Epic: [E10](../epics/E10-living-building.md)
Depends on: S09-01, S03-04

## Story

As an operator, I want each project's team on its own floor so I can walk between teams the way I would walk between rooms.

## Acceptance criteria

- The seed adds a second project with three to five agents, tasks, and at least one session. Every existing scenario keeps working, and its first project still lands on floor 1.
- Desks, characters, the board, QA screen, status display, and 2D lists show only the current floor's project. Filtering is a pure selector over the snapshot (`floorAgents`, `floorTasks`), not a copied list.
- Mission control (S08-01) shows the building total and the current floor, clearly labelled.
- The elevator panel shows each floor's live summary: active agents and blocked tasks.
- Opening an agent's desk from a search or event on another floor offers "Go to floor N" rather than opening a panel for someone who is not in the room.
- Merge policy, transitions, and metrics tests are unchanged except for count updates caused by the new seed.

## Verification

- Unit tests for the selectors and for `buildingDirectory` with two projects.
- Playwright: switch to floor 2 and see its team in the 2D roster.

## Out of scope

Creating projects from the UI.
