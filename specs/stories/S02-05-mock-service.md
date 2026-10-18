# S02-05 — Mock service, scenarios, and effect guard

Status: todo
Epic: [E02](../epics/E02-domain.md)
Depends on: S02-02, S02-03, S02-04

## Story

As a demo host, I want five deterministic scenarios and a workflow service so the app can show success and failure without calling real systems.

## Acceptance criteria

- Scenarios:
  1. developer implementing a feature
  2. pull request passing review and QA
  3. pull request failing a test and returning to the developer
  4. agent blocked and requesting help
  5. successful simulated merge
- Each scenario has stable ids, meaningful task dependencies, and an event log that explains the current state.
- There are six to eight agents with distinct names, roles, runtime labels, and model labels.
- `loadScenario` replaces the snapshot. Repeating the same id yields deep-equal data.
- Commands delegate to domain functions and return `CommandResult`.
- The service module does not import `child_process`, `node:child_process`, or a GitHub client. A unit test scans the mock service source, or a dependency-cruiser style assertion if already present, and fails if those imports appear. A simple source scan test is enough.
- Usage figures exist only as fields named or documented as mock estimates.
- A store module exposes the snapshot and dispatches port commands. Components are not required yet. A node test can subscribe and see a task move.

## Seed content guidance

Use a single project, ForgeVille itself or a fictional product inside the company, so reception copy has something to say. Include at least one dependency where a blocked task waits on another task. Do not use `Math.random` in scenario construction.

## Verification

- `npm test` loads each scenario and runs one command against the merge and blocked scenarios.

## Out of scope

Network stubs that pretend to be GitHub. Absence is the simulation boundary.
