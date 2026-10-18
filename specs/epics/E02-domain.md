# E02 — Domain and mock workflow

Status: todo

## Outcome

All product rules live in typed domain functions and a mock service. UI and 3D code written later call commands and read one snapshot.

## Stories

- [S02-01](../stories/S02-01-domain-types.md)
- [S02-02](../stories/S02-02-transitions.md)
- [S02-03](../stories/S02-03-merge-policy.md)
- [S02-04](../stories/S02-04-metrics.md)
- [S02-05](../stories/S02-05-mock-service.md)

## Done when

- The five demo scenarios load deterministically.
- Valid and invalid task moves, agent presence, merge eligibility, QA failure, and mission-control metrics have unit tests.
- A guard test shows this milestone cannot spawn processes or call GitHub.

## Out of scope

Rendering the office. Building real adapters.
