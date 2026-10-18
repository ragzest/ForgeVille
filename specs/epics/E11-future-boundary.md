# E11 — Future boundary: one real runtime

Status: blocked

This epic is a boundary, not a backlog item. Do not implement it during milestone 0.

## Intent

After the simulated office is solid, connect one coding-agent runtime to an isolated local workspace. The office should keep using `WorkflowPort`. A new adapter would translate real session events into the same snapshot shape.

## Not allowed yet

- Importing Claude Code, Codex, Pi, or OpenCode SDKs
- Spawning shells
- Reading or writing GitHub
- Sending repository files to a hosted model
- Treating mock merge policy as permission to merge a real branch

## Entry criteria

- Every milestone-0 story is done.
- The effect-guard test still fails the build if production UI imports a real adapter by accident.
- A follow-up spec names the runtime, the isolated directory, the permission boundary, and how simulated labels are removed only for that live session.

Until those exist, contributors stop at E09.
