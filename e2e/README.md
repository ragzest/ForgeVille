# End-to-end tests

Playwright starts the Vite dev server (`npm run dev`) and runs the specs in this folder.

First run on a new machine:

```sh
npx playwright install chromium
npm run test:e2e
```

If a Chromium build is already installed somewhere else (for example in a sandbox), skip the download and point Playwright at it:

```sh
PLAYWRIGHT_CHROMIUM_EXECUTABLE=/path/to/chrome npm run test:e2e
```

## The walkthrough

`walkthrough.spec.ts` is the one test to read first. On the 2D path it selects the `qa-failure` scenario, tries to merge pull request #2 and checks the refusal names the failed browser check, opens Ada's simulated terminal, and rides to a vacant floor and back. It runs twice: from the 3D office (asserting the canvas drew first) and with `?webgl=off`. If the browser has no WebGL, the first run still passes through the 2D path and adds a `limitation` annotation to the report.

Any request that leaves the dev server fails the walkthrough, and requests to GitHub or agent hosts (Anthropic, OpenAI) are aborted before they leave.
