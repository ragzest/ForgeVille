# S05-03 — Pause, resume, interrupt

Status: todo
Epic: [E05](../epics/E05-desks.md)
Depends on: S05-01, S02-05

## Story

As a user, I want to pause, resume, or interrupt a simulated session so I can see the office respond to session state.

## Acceptance criteria

- Pause, resume, and interrupt call the workflow port.
- Illegal commands show the returned reason and do not change the snapshot.
- A paused or interrupted working agent no longer presents as working.
- A system transcript line records the command.
- Buttons reflect the current session state. Resume is unavailable when already running. Pause is unavailable when not running.
- The desk monitor changes with the command, because it reads the snapshot: a `SESSION PAUSED` or `SESSION INTERRUPTED` banner appears and the cursor stops. No extra wiring may be added for this.
- The character's pose changes from typing to idle on pause, through presence.

## Verification

- Component test clicks pause and asserts the store command result using a fake port or the mock service.
- Domain tests from E02 still pass.

## Out of scope

Killing a real process.
