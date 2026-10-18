# S02-03 — Pull-request policy and QA failure

Status: done
Epic: [E02](../epics/E02-domain.md)
Depends on: S02-02

## Story

As a reviewer, I want merge and request-changes to obey a mock policy so a button cannot bypass failing checks.

## Acceptance criteria

- Policy input is the pull request, its test runs, review report, and task.
- Merge is eligible only when review is approved, unit, build, and browser checks pass, and no blocking finding is unresolved.
- `mergePullRequest` on an eligible request sets the pull request merged, moves the task to `merged`, and appends a merge event.
- `mergePullRequest` on an ineligible request returns the failed reasons and leaves status unchanged.
- A QA failure command, or loading a failure transition, sets the failed check, moves the task to `in_progress`, assigns it to the authoring agent, and appends a failure event.
- `requestChanges` records the finding, sets review to changes requested, and moves the task back to `in_progress` when it was in review or QA.
- Tests cover eligible merge, missing approval, failed unit test, unresolved blocking finding, already merged, and QA failure return.

## Verification

- `npm test` for policy and QA failure.

## Out of scope

UI buttons. The functions must be callable without React.
