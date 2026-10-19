# S03-04 — Themed floors, cel-shaded look, and live displays

Status: done
Epic: [E03](../epics/E03-office.md)
Depends on: S03-03, S04-03, S05-01

## Why

A review of the office after S05-01 found it worked but did not charm:

- One forest-green palette covered walls, chairs, labels, and chrome, so zones blurred together and nothing had a focal point.
- The room floated in an empty cream void. There was nothing beyond the windows and no ceiling.
- Monitors were blank. The agents' simulated sessions, the most interesting thing in the product, were invisible in the world.
- The whiteboard, QA screen, and status display were empty slabs until their panel stories land.
- Characters had no faces and no name tags, so you could not tell who was who without opening a desk.

The reference for the new direction is [cubefarm](https://github.com/leonvanzyl/cubefarm), a real-agent office. This story borrows its cel-shaded, ink-outlined, sticker-UI look, and the idea of one floor per project. It does not borrow its real terminals: ForgeVille stays simulated.

## Story

As a visitor, I want a building of distinct, cozy floors where I can see agents working on their screens, so the office feels alive before I open a single panel.

## Acceptance criteria

### Building and floors

- The building has four floors with their own theme: Workshop (morning), Greenhouse (noon), Night Studio (night), Ember Forge (sunset). Themes are data in `src/ui/themes.ts`.
- Projects occupy floors from the ground up, in snapshot order (`buildingDirectory`). Occupancy is derived, never stored in the snapshot.
- A floor with no project is vacant. Its furniture renders, its desks show a "Vacant desk" screensaver, and only the elevator is interactive.
- The toolbar offers every floor. An elevator in reception (landmark id `elevator`) opens a panel that lists floors top to bottom, with each floor's theme and occupant.
- Changing floors keeps the visitor's position in the floor plan and closes any open panel. A short arrival banner names the floor.
- The page chrome takes the floor's accent through CSS custom properties. Status colours never change between floors.
- The 2D view says when the current floor is vacant and offers a button back to the team's floor.

### Look

- Solids use a toon material on a shared three-step ramp and carry a screen-space ink outline (`#1f1d2b`). Glows, glass, and light pools have no outline.
- Walls have real window openings, an accent stripe, and skirting. The floor is procedural planks. A downward-facing ceiling with lamp panels is invisible from the overview camera.
- Outside: a gradient sky with a sun or moon, stars at night, drifting clouds by day, trees, roads, and a ring of city blocks. On upper floors the ground drops away by one storey per level.
- Night and sunset floors switch lamps on: warm pools under ceiling lamps and lit city windows. Monitors throw a soft pool of light on their desks.
- No post-processing library and no bloom.

### Live displays (read-only)

- Each desk monitor paints the agent's latest simulated transcript lines (`screenModel`): a title bar with runtime and handle, a visible `SIMULATED` tag, timestamps, commands, and a blinking cursor only while the session is running.
- Blocked, awaiting review, reviewing, and paused or interrupted sessions show a banner on the screen.
- Agents without a session show a screensaver.
- The whiteboard paints every task as a sticky note in its domain column, with an "Empty" note for empty columns.
- The QA screen shows the newest open pull request's required checks, each with an icon and a word.
- The status display shows active agents, open PRs, blocked tasks, and merges from `missionControlMetrics`.
- None of these displays write to the store. Textures repaint only when their view model changes.

### Characters

- Faces with eyes, blush, and a mouth that follows the pose. They blink and breathe; reduced motion stops both.
- A name tag shows `Name · ISSUE` with a border in the runtime's colour. It hides when the camera is within 2 m, so it never covers the view.
- Status marks and labels from S03-03 are kept.

### Chrome

- Bundled Fredoka and JetBrains Mono fonts (`@fontsource-variable/*`), with no network font requests. The canvas waits up to 1.5 s for them before painting signs.
- Sticker-style panels: paper, ink borders, hard offset shadows, and an accent header.

## Verification

- Unit: `themes.test.ts` (valid colours, contrast ≥ 4.5 for accent text), `building.test.ts`, `screenModel.test.ts`, `displays.test.ts`, `materials.test.ts`, and the wall-opening test in `layout.test.ts`.
- Component: `building.ui.test.tsx` (toolbar floors, elevator panel, vacant 2D notice, vacant-floor targets).
- Playwright: `e2e/building.spec.ts` rides to Night Studio and back with no console errors. All earlier e2e specs still pass unchanged.
- Manual: walk each floor at 1280 px and 390 px. Check the overview, the board, QA, the status display, a blocked agent, and a merge celebration.

## Out of scope

- A second seeded project. Floors 2–4 stay vacant until [S10-01](S10-01-multi-project-floors.md).
- Day–night cycles, ambient errands, sound, and quality tiers. See [E10](../epics/E10-living-building.md).
