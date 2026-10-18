# S07-02 — Merge and request-changes actions

Status: todo
Epic: [E07](../epics/E07-qa-pr.md)
Depends on: S07-01

## Story

As a reviewer, I want merge and request-changes to call the mock policy so I can see a blocked merge and a permitted one.

## Acceptance criteria

- Merge calls `mergePullRequest`. On refusal, the panel shows each reason and the snapshot is unchanged.
- On success, the panel shows merged, the task column is Merged, and an event is added.
- Request changes calls the port, shows the finding, and returns the task to In Progress.
- The success scenario can merge. The failing-test scenario cannot merge until checks pass. Do not add a hidden "force merge".
- Action buttons are keyboard accessible and have disabled states that still expose the reason.

## Verification

- Component tests with the mock service for both scenarios.

## Out of scope

Real GitHub merge.
