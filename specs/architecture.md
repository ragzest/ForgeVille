# Architecture

Status: binding for milestone 0.

## Goal

Keep the office presentation, the React panels, and the workflow rules apart. A later real adapter must be able to replace the mock service without rewriting desks, the board, or mission control.

## Stack

Use this unless a story documents a constraint that forces a change:

- React, TypeScript, Vite
- Three.js, React Three Fiber, Drei
- Vitest and Playwright
- ESLint and TypeScript `strict`
- A small shared store. Zustand is allowed because the 3D canvas and overlays must subscribe selectively and movement must not rerender panels. Do not add Redux, a backend framework, or an agent SDK.

No database. No server. State lives in memory and resets with the page, except a scenario choice may be reflected in the URL query for testability.

## Module map

Create these areas when the stories require them. Do not put the app in one component.

```text
src/
  app/                 composition, providers, scenario bootstrap
  domain/              types, transitions, policies, metric calculations
  services/
    ports.ts           interfaces future adapters must implement
    mock/              deterministic data, sessions, scenario runner
    guard.ts           refuses external side effects in this milestone
  store/               shared readable state and command dispatch
  world/               canvas, office geometry, characters, interaction volumes
  features/
    mission-control/
    board/
    agent-panel/
    terminal/
    pull-request/
    navigation/
  ui/                  shared panels, status marks, buttons
```

Tests live next to the unit they cover, or under `e2e/` for Playwright.

## State ownership

The store holds the domain snapshot:

- projects
- agents
- tasks
- agent sessions
- pull requests
- test runs
- review reports
- events
- derived view models may be computed, not stored as a second source of truth

Allowed writers:

- mock workflow commands
- scenario loader
- user commands that call those commands (`moveTask`, `pauseSession`, `requestChanges`, `mergePullRequest`)

Not allowed:

- a character animation completing and then marking a task merged
- a panel inventing a counter that is not derived from the snapshot
- a 3D object storing task status that the board does not read

## Domain rules

Task columns:

`backlog` → `ready` → `in_progress` → `in_review` → `qa` → `merged`

`blocked` may be entered from `in_progress`, `in_review`, or `qa`, and may return only to the column recorded as `blockedFrom`.

Invalid examples:

- `backlog` directly to `merged`
- `qa` to `merged` when required checks fail
- moving a task assigned to an agent that is `interrupted` without an explicit resume or reassignment command

Agent presence, derived from session plus task, not hand-waved in the scene:

- `working` — session running and task in progress
- `idle` — no running session
- `blocked` — assigned task is blocked
- `awaiting_review` — assigned task is in review or QA and the agent is not the active reviewer
- `reviewing` — agent is the active reviewer on an open pull request
- `celebrating` — a transient presentation flag after a successful simulated merge, cleared by the scenario clock, never used as merge proof

Pull-request merge is allowed only when all are true:

- review status is approved under the mock policy
- unit tests, build, and browser tests are passing
- no unresolved blocking findings
- the pull request is not already merged or closed
- the acting command is `mergePullRequest`, not a generic task drag

A failed required check sends the task back to `in_progress` for the authoring agent and records a failure event. The UI must show the failed check and the reason.

## Ports

Define interfaces now. Implement only the mock.

```ts
interface WorkflowPort {
  getSnapshot(): WorkflowSnapshot;
  loadScenario(id: ScenarioId): WorkflowSnapshot;
  moveTask(taskId: string, to: TaskColumn): CommandResult;
  pauseSession(sessionId: string): CommandResult;
  resumeSession(sessionId: string): CommandResult;
  interruptSession(sessionId: string): CommandResult;
  requestChanges(pullRequestId: string, findingId?: string): CommandResult;
  mergePullRequest(pullRequestId: string): CommandResult;
}
```

`CommandResult` is `{ ok: true, snapshot } | { ok: false, reason, snapshot }`.

Future adapters may implement the same port. They must not be imported by milestone-0 UI.

## External-effect guard

Milestone 0 has no `fetch` to GitHub or agent vendors, no `child_process`, and no terminal spawn. Add a unit test that the mock service module graph does not import network or process APIs, and that command handlers return domain results only.

If a later experiment needs a browser API such as pointer lock, that is allowed. It is not an external engineering operation.

## Scenarios

Ship these deterministic scenarios. They are data plus a fixed event log, not random timers.

1. Developer implementing a feature.
2. Pull request passing review and QA.
3. Pull request failing a test and returning to the developer.
4. Agent blocked and requesting help.
5. Successful simulated merge, only when policy passes.

A scenario switcher replaces the snapshot. It does not mutate a hidden second store.

## Rendering rules

- Share geometries and materials for repeated desks, chairs, plants, and monitors.
- Character motion reads derived presence. It does not write domain state.
- Camera motion stays predictable. Pointer lock releases on Escape and when a text input or terminal panel is open.
- Keyboard movement ignores events while focus is in an input, textarea, or open terminal-style panel.
- Reduced motion replaces walking, idle loops, and celebration with pose changes or still poses.

## Testing bar

Unit tests cover transitions, agent presence, merge eligibility, QA failure handling, and mission-control metrics.

Component tests cover panel open/close and blocked-merge reasons where cheap.

Playwright covers one office walkthrough through the 2D alternative and at least one 3D smoke assertion that the canvas is present. Do not make CI depend on WebGL pixel diffs.

## Decision log

| Decision | Choice | Why |
| --- | --- | --- |
| Store | Zustand, or a store with the same selective subscription behavior | Movement must not rerender panels |
| Routing | No router in milestone 0 | One office, overlays, optional `?scenario=` |
| Assets | Simple generated geometry first | Do not block on custom models |
| Time | Scenario clock, not `Math.random` workflow rolls | Demos must be explainable |
| Merge | Policy function in `domain/` | Buttons call the policy; they do not bypass it |
