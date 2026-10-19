# S07-01 — Pull-request detail panel

Status: done
Epic: [E07](../epics/E07-qa-pr.md)
Depends on: S04-02, S02-03, S02-05

## Story

As a reviewer, I want a pull-request panel from the QA screen so I can see branches, checks, and findings before I act.

## Acceptance criteria

- QA screen interaction and a 2D link open the panel.
- Panel shows title, PR number, source branch, base branch, authoring agent, review status, unit status, build status, browser-test status, test-run timeline, review findings, and screenshot placeholders.
- Placeholders are labelled "Simulated screenshot".
- Passing and failing scenarios render different statuses from data.
- Status uses text and icon as well as color.
- Blocked merge reasons are visible before the user clicks merge, when the policy would refuse.
- The QA wall screen already shows the newest open pull request's checks through `qaDisplay` (S03-04). The panel's check rows must use the same status words and icons (✓ Passed, ✕ Failed, ◐ Running, … Queued).

## Verification

- Component tests for the passing scenario and the failing scenario.

## Out of scope

The merge mutation. Buttons can be present but wired in S07-02.
