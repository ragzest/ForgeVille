# S05-01 — Desk detail panel

Status: done
Epic: [E05](../epics/E05-desks.md)
Depends on: S04-02, S02-05

## Story

As a user, I want a desk panel that explains the agent and their current work so I do not need the 3D scene to understand status.

## Acceptance criteria

- Opening a desk from the world or the 2D roster shows the same panel for that agent id.
- Panel shows name, role, avatar, assigned task, linked issue, runtime label, model label, presence, branch, last activity, and recent events for that agent.
- Estimated usage is visible only with a "Mock estimate" label.
- Buttons are present for inspect task, open terminal, pause, resume, and interrupt. Terminal and session buttons may be disabled until their stories, but the disabled reason is visible.
- Inspect task selects that task for the board story. If the board panel does not exist yet, show the task title and column.
- Close control and Escape close the panel when pointer lock is not active.
- Panel is readable at 1280px and usable at 390px width.

## Verification

- Component test renders an agent fixture and asserts issue id, branch, and mock label.

## Out of scope

Transcript rendering beyond a button.
