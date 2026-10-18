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
