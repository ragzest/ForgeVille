# S01-01 — Scaffold the app and quality scripts

Status: done
Epic: [E01](../epics/E01-foundation.md)
Depends on: none

## Story

As a contributor, I want a strict Vite React TypeScript app with lint and test scripts so later slices start from a working toolchain.

## Acceptance criteria

- Package manager is npm.
- TypeScript `strict` is on.
- Scripts exist: `dev`, `build`, `preview`, `typecheck`, `lint`, `test`, `test:e2e`.
- Vitest runs at least one passing unit test.
- Playwright is configured against the Vite dev server and has one shell smoke test that can be skipped only if the browser install is documented. The smoke test may be a placeholder assertion that the document title contains ForgeVille.
- ESLint covers TypeScript and React without unused-disable noise.
- `.gitignore` ignores dependencies, build output, and Playwright reports.
- No backend, database, Electron, or agent SDK packages.

## Verification

- `npm install`
- `npm run typecheck`
- `npm run lint`
- `npm test`

## Out of scope

Visual design, 3D dependencies. Add `three`, `@react-three/fiber`, and `@react-three/drei` in S03-01, not here, unless the shell story needs a canvas probe. Prefer adding them in S03-01.
