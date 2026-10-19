# Roadmap

Build top to bottom. Stories inside an epic stay in order unless the story says otherwise. Do not start E11.

Status key: `todo` | `in-progress` | `done`

## Milestone 0 — simulated office

| Order | Id | Title | Status |
| --- | --- | --- | --- |
| 1 | [E01](epics/E01-foundation.md) | Foundation | done |
| 1.1 | [S01-01](stories/S01-01-scaffold-app.md) | Scaffold the app and quality scripts | done |
| 1.2 | [S01-02](stories/S01-02-app-shell.md) | App shell, loading, and WebGL fallback | done |
| 2 | [E02](epics/E02-domain.md) | Domain and mock workflow | done |
| 2.1 | [S02-01](stories/S02-01-domain-types.md) | Domain types and snapshot | done |
| 2.2 | [S02-02](stories/S02-02-transitions.md) | Task transitions and agent presence | done |
| 2.3 | [S02-03](stories/S02-03-merge-policy.md) | Pull-request policy and QA failure | done |
| 2.4 | [S02-04](stories/S02-04-metrics.md) | Mission-control metrics | done |
| 2.5 | [S02-05](stories/S02-05-mock-service.md) | Mock service, scenarios, and effect guard | done |
| 3 | [E03](epics/E03-office.md) | 3D office | done |
| 3.1 | [S03-01](stories/S03-01-office-shell.md) | Lit office shell and zone layout | done |
| 3.2 | [S03-02](stories/S03-02-furnishings.md) | Desks, board, QA corner, meeting area | done |
| 3.3 | [S03-03](stories/S03-03-characters.md) | Characters bound to agent presence | done |
| 3.4 | [S03-04](stories/S03-04-themed-floors.md) | Themed floors, cel-shaded look, live displays | done |
| 4 | [E04](epics/E04-navigation.md) | Movement and navigation | done |
| 4.1 | [S04-01](stories/S04-01-player-controls.md) | Walk, look, run, pointer lock | done |
| 4.2 | [S04-02](stories/S04-02-interact.md) | Proximity interaction and hints | done |
| 4.3 | [S04-03](stories/S04-03-overview-and-2d.md) | Overview, zone travel, and 2D alternative | done |
| 5 | [E05](epics/E05-desks.md) | Agent desks | done |
| 5.1 | [S05-01](stories/S05-01-agent-panel.md) | Desk detail panel | done |
| 5.2 | [S05-02](stories/S05-02-terminal.md) | Simulated terminal | done |
| 5.3 | [S05-03](stories/S05-03-session-commands.md) | Pause, resume, interrupt | done |
| 6 | [E06](epics/E06-board.md) | Kanban whiteboard | done |
| 6.1 | [S06-01](stories/S06-01-board.md) | Board from snapshot | done |
| 6.2 | [S06-02](stories/S06-02-task-moves.md) | Inspect and simulate valid moves | done |
| 7 | [E07](epics/E07-qa-pr.md) | QA lab and pull-request theatre | done |
| 7.1 | [S07-01](stories/S07-01-pr-panel.md) | Pull-request detail panel | done |
| 7.2 | [S07-02](stories/S07-02-merge-actions.md) | Merge and request-changes actions | done |
| 8 | [E08](epics/E08-mission-control.md) | Mission control | todo |
| 8.1 | [S08-01](stories/S08-01-mission-control.md) | Overlay metrics and event feed | todo |
| 9 | [E09](epics/E09-vertical-slice.md) | Cohesive prototype | in-progress |
| 9.1 | [S09-01](stories/S09-01-scenario-switcher.md) | Scenario switcher across all views | done |
| 9.2 | [S09-02](stories/S09-02-polish.md) | Visual polish, reduced motion, empty states | todo |
| 9.3 | [S09-03](stories/S09-03-e2e.md) | End-to-end walkthrough | todo |
| 9.4 | [S09-04](stories/S09-04-readme.md) | Operator README | todo |

## Milestone 0.5 — living building

Starts after E09. It adds delight on top of a complete floor and never changes workflow rules.

| Order | Id | Title | Status |
| --- | --- | --- | --- |
| 10 | [E10](epics/E10-living-building.md) | Living building | todo |
| 10.1 | [S10-01](stories/S10-01-multi-project-floors.md) | Multi-project floors | todo |
| 10.2 | [S10-02](stories/S10-02-day-and-ambient-life.md) | Time of day and ambient life | todo |
| 10.3 | [S10-03](stories/S10-03-quality-tiers.md) | Quality tiers and screen glow | todo |

## Milestone 1 — not started

| Id | Title | Status |
| --- | --- | --- |
| [E11](epics/E11-future-boundary.md) | One real agent runtime, isolated workspace | blocked |

E11 stays blocked until every milestone-0 story is `done` and the definition of done in `product-brief.md` is checked.

## Parallelism

After S02-05, world stories (E03, E04) and panel stories (E05–E08) can proceed in parallel only if they both read the store and neither invents domain rules. Prefer finishing E02 and E04 before polishing E09.

## Increment rule

Each story should leave `npm run typecheck`, `npm run lint`, and `npm test` passing once those scripts exist (S01-01). A story that cannot be exercised yet still needs a unit test or a documented manual check in the story's verification section.
