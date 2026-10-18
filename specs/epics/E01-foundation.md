# E01 — Foundation

Status: todo

## Outcome

A strict TypeScript app boots locally with lint, unit test, and end-to-end harnesses ready. The shell can show a loading state, a fatal error, and a 2D fallback if WebGL is unavailable.

## Why this is first

Later stories need one place to render, one command to verify, and a fallback that does not depend on the office existing yet.

## Stories

- [S01-01](../stories/S01-01-scaffold-app.md)
- [S01-02](../stories/S01-02-app-shell.md)

## Done when

- `npm install`, `npm run dev`, `npm run typecheck`, `npm run lint`, and `npm test` work from a clean clone.
- Playwright is installed and can open the app shell.
- The README is still the planning README until [S09-04](../stories/S09-04-readme.md). A short `apps` note in package scripts is enough here.

## Out of scope

Office geometry, domain types, and visual polish beyond a readable shell.
