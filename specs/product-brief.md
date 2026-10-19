# ForgeVille — product brief

Status: accepted for milestone 0 (simulated prototype).

## Vision

ForgeVille should feel like a living software company, not an admin dashboard with a 3D background.

The user walks a cozy, cel-shaded office building. Each floor has its own theme and time of day. The user approaches agent desks, reads each agent's simulated terminal on its monitor, visits the Kanban board, and reviews pull requests in a QA lab. The experience is playful. The information design stays professional.

Every view in this milestone prepares later integration with real agent sessions, GitHub events, tests, and build results. This milestone does not perform those integrations.

## Milestone 0 outcome

A locally runnable prototype where:

- navigation, desks, the whiteboard, QA lab, and mission control work
- task and agent state is consistent across 3D and 2D views
- demo scenarios include both successful and failing workflows
- merge eligibility is governed by mock policy
- tests, lint, and type-check pass
- no real coding agents, GitHub operations, or paid external services are invoked

## In scope

- React, TypeScript, Vite application shell
- Three.js office via React Three Fiber and Drei, cel-shaded with ink outlines
- A building of four themed floors. Projects occupy floors from the ground up; empty floors are vacant but walkable
- Responsive overlay UI
- Typed mock domain and deterministic scenarios
- Vitest unit tests and one Playwright walkthrough
- ESLint and TypeScript strict mode
- README covering setup, architecture, controls, and limitations

## Out of scope

- Launching Claude Code, Codex, Pi, OpenCode, or any other agent runtime
- GitHub reads or writes, including issues, pull requests, checks, and merges
- A backend, database, desktop packaging, or agent SDK
- A full entity-component system, plugin framework, or premature agent abstraction
- Custom high-detail character modelling that blocks a playable office
- Random workflow changes that are not explained by the state model

## Users

Primary user: a developer evaluating ForgeVille as a future place to watch and direct coding agents.

They need to understand who is working, what is blocked, whether a pull request can merge, and that everything on screen is still a simulation.

## Principles

- One source of truth. Animation and panel chrome read domain state. They do not own it.
- Explicit transitions. Invalid moves fail with a reason.
- Label simulation. Terminal output, usage, screenshots, and merges must not look like live production systems without a visible simulated label.
- Professional hierarchy. Cute characters and plants do not replace readable status, issue IDs, and review findings.
- Small dependencies. Add a library only when the architecture doc allows it or a story records the exception.

## Definition of done

The prototype is complete when all milestone-0 stories in `roadmap.md` are `done` and:

1. The app starts locally using documented commands.
2. The user can navigate the 3D office and interact with its main locations.
3. Agent desks, the whiteboard, QA lab, and mission control work.
4. Task and agent state is consistent across all views.
5. The demo includes both successful and failing workflows.
6. Merge eligibility is governed by the mock policy, not by a button click alone.
7. The UI is visually polished and free of major console errors.
8. Tests, lint, and type-check pass.
9. The README explains setup, architecture, controls, and limitations.
10. No real coding agents, GitHub operations, or paid external services are invoked.

## Recommended next milestone

After milestone 0, connect one real coding-agent runtime to an isolated local workspace. That work is specified only as a boundary in [E11](epics/E11-future-boundary.md). It is not part of the prototype backlog.
