# S02-02 — Task transitions and agent presence

Status: todo
Epic: [E02](../epics/E02-domain.md)
Depends on: S02-01

## Story

As a product owner, I want task moves and agent status to follow explicit rules so the board and the office cannot disagree.

## Acceptance criteria

- `moveTask` allows only the transitions in `architecture.md`.
- Entering `blocked` stores `blockedFrom`. Leaving `blocked` returns only to that column.
- Illegal moves return `{ ok: false, reason }` and do not change the task.
- Presence is a pure function of agent, session, and assigned task:
  - working, idle, blocked, awaiting_review, reviewing
- Celebration is not a stored workflow status. If represented, it is a presentation hint with an expiry on the scenario clock, ignored by merge policy.
- Unit tests cover each valid neighbor move and at least four invalid moves, including backlog to merged and a blocked task returning to the wrong column.

## Verification

- `npm test` for `domain/transitions`.

## Out of scope

Pull-request checks. Those land in S02-03. `moveTask` into `merged` should fail here unless a later policy module is already present. Prefer refusing `merged` in this story and allowing it only through `mergePullRequest` in S02-03.
