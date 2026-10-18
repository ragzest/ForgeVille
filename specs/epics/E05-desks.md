# E05 — Agent desks

Status: todo

## Outcome

Approaching or selecting a desk explains who the agent is, what they are doing, and that the session is simulated. The user can pause, resume, or interrupt that simulation.

## Stories

- [S05-01](../stories/S05-01-agent-panel.md)
- [S05-02](../stories/S05-02-terminal.md)
- [S05-03](../stories/S05-03-session-commands.md)

## Done when

- Desk selection and the 2D roster open the same panel from the same agent id.
- Terminal lines come from the session transcript in the snapshot.
- Session commands go through the workflow port and update presence.

## Out of scope

Real PTY sessions, shell access, or streaming from a model provider.
