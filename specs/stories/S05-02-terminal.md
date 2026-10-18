# S05-02 — Simulated terminal

Status: todo
Epic: [E05](../epics/E05-desks.md)
Depends on: S05-01

## Story

As a user, I want a terminal-style view of the mock session so I can read what the agent "did" without thinking a real process is running.

## Acceptance criteria

- The panel is labelled "Simulated session" in text, not only by color.
- Lines show timestamp and text from the session transcript.
- The view uses a monospace terminal styling and does not spawn a shell.
- The panel has `data-captures-keys` so WASD does not move the player while it is open.
- Empty transcript shows an explicit empty state.
- Copy does not claim tests were executed on a real machine.

## Verification

- Component test for the simulated label and a fixture line.
- Manual: open terminal, press W, confirm the player stays put.

## Out of scope

Streaming, stdin, or command execution.
