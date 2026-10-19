# S05-02 — Simulated terminal

Status: done
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
- The panel looks like the desk monitor, scaled up: a dark terminal (`COLORS.screen`), a title bar with the runtime accent from `runtimeStyle`, a `SIMULATED` pill, JetBrains Mono, and the same colours for commands, output, and system lines.
- Lines come from the full session transcript. The desk monitor's `screenModel` shows the newest lines, so a test asserts that the monitor's last line equals the panel's last line.
- The panel scrolls to the newest line on open. It shows the same banner as the monitor (blocked, awaiting review, paused, interrupted).
- The cursor blinks only while the session is running, and is steady under reduced motion.

## Verification

- Component test for the simulated label and a fixture line.
- Unit test: panel lines and `screenModel(...).lines` agree for the same snapshot.
- Manual: open terminal, press W, confirm the player stays put.

## Out of scope

Streaming, stdin, or command execution.
