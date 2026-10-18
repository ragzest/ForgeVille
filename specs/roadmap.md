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
| 4 | [E04](epics/E04-navigation.md) | Movement and navigation | in-progress |
| 4.1 | [S04-01](stories/S04-01-player-controls.md) | Walk, look, run, pointer lock | done |
| 4.2 | [S04-02](stories/S04-02-interact.md) | Proximity interaction and hints | done |
| 4.3 | [S04-03](stories/S04-03-overview-and-2d.md) | Overview, zone travel, and 2D alternative | todo |
| 5 | [E05](epics/E05-desks.md) | Agent desks | todo |
| 5.1 | [S05-01](stories/S05-01-agent-panel.md) | Desk detail panel | todo |
| 5.2 | [S05-02](stories/S05-02-terminal.md) | Simulated terminal | todo |
| 5.3 | [S05-03](stories/S05-03-session-commands.md) | Pause, resume, interrupt | todo |
| 6 | [E06](epics/E06-board.md) | Kanban whiteboard | todo |
| 6.1 | [S06-01](stories/S06-01-board.md) | Board from snapshot | todo |
| 6.2 | [S06-02](stories/S06-02-task-moves.md) | Inspect and simulate valid moves | todo |
| 7 | [E07](epics/E07-qa-pr.md) | QA lab and pull-request theatre | todo |
| 7.1 | [S07-01](stories/S07-01-pr-panel.md) | Pull-request detail panel | todo |
| 7.2 | [S07-02](stories/S07-02-merge-actions.md) | Merge and request-changes actions | todo |
| 8 | [E08](epics/E08-mission-control.md) | Mission control | todo |
| 8.1 | [S08-01](stories/S08-01-mission-control.md) | Overlay metrics and event feed | todo |
| 9 | [E09](epics/E09-vertical-slice.md) | Cohesive prototype | todo |
| 9.1 | [S09-01](stories/S09-01-scenario-switcher.md) | Scenario switcher across all views | todo |
| 9.2 | [S09-02](stories/S09-02-polish.md) | Visual polish, reduced motion, empty states | todo |
| 9.3 | [S09-03](stories/S09-03-e2e.md) | End-to-end walkthrough | todo |
| 9.4 | [S09-04](stories/S09-04-readme.md) | Operator README | todo |

## Milestone 1 — not started

| Id | Title | Status |
| --- | --- | --- |
| [E11](epics/E11-future-boundary.md) | One real agent runtime, isolated workspace | blocked |

E11 stays blocked until every milestone-0 story is `done` and the definition of done in `product-brief.md` is checked.

## Parallelism

After S02-05, world stories (E03, E04) and panel stories (E05–E08) can proceed in parallel only if they both read the store and neither invents domain rules. Prefer finishing E02 and E04 before polishing E09.

## Increment rule

Each story should leave `npm run typecheck`, `npm run lint`, and `npm test` passing once those scripts exist (S01-01). A story that cannot be exercised yet still needs a unit test or a documented manual check in the story's verification section.
