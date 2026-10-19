# ForgeVille

A charming, cartoon-style 3D office where AI coding agents work together to build software.

This repository currently holds the product brief, architecture boundaries, and an incremental backlog. The playable prototype is not implemented yet. Build it epic by epic from `specs/roadmap.md`. Do not skip ahead into real coding-agent runtimes or GitHub writes.

## What this milestone is

A local, simulated software company you can walk through:

- a small building of themed floors (one occupied by the demo team)
- mock agents at desks
- a Kanban board, QA lab, and pull-request review area
- mission control derived from the same mock state

Real Claude Code, Codex, Pi, OpenCode, and GitHub operations are out of scope until a later milestone.

## Start here

1. Read `specs/product-brief.md`.
2. Read `specs/architecture.md` before adding code.
3. Pick the next unchecked story in `specs/roadmap.md`.
4. Implement only that story, with its tests, then update the story status.

Suggested first slice: [E01 — Foundation](specs/epics/E01-foundation.md), story [S01-01](specs/stories/S01-01-scaffold-app.md).

## Repository map

```text
specs/
  product-brief.md      Product vision and definition of done
  architecture.md       Modules, state ownership, and future ports
  design.md             Visual and interaction constraints
  roadmap.md            Build order
  epics/                Outcome-sized increments
  stories/              Implementable slices with acceptance criteria
```

## Constraints

- One source of truth for tasks, agents, pull requests, and events.
- 3D presentation must not decide whether work succeeded.
- Simulated UI must be labelled as simulated.
- No real processes, network calls to agent vendors, or GitHub mutations in this milestone.
- Merge actions follow the mock policy. A button click alone is not enough.

## Later milestone

Connect one real coding-agent runtime to an isolated local workspace. See `specs/epics/E11-future-boundary.md`. Do not start that work while the prototype stories are open.
