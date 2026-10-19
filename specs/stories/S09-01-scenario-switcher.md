# S09-01 — Scenario switcher across all views

Status: todo
Epic: [E09](../epics/E09-vertical-slice.md)
Depends on: S03-03, S05-03, S06-02, S07-02, S08-01

## Story

As a demo host, I want to switch scenarios and see the office, board, QA panel, and mission control update together.

## Acceptance criteria

- A control lists the five scenarios by name.
- Choosing one calls `loadScenario` and closes stale selections that no longer exist.
- `?scenario=` loads that scenario on startup and is updated when the user switches, so tests can deep-link.
- Unknown scenario ids fall back to the default scenario and show a non-blocking notice.
- No view keeps a private copy of tasks or agents after the switch.
- Switching scenario keeps the current floor. Monitors, whiteboard, QA screen, and status display repaint from the new snapshot.

## Verification

- Component or Playwright test: load the failing scenario from the query string and see the failed check name in mission control or the PR panel.

## Out of scope

Editing scenario files in the UI.
