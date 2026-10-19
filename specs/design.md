# Design constraints

Status: binding for visual and interaction stories.

## Feel

A cozy, cartoon life-sim office in a small tower. It is cel-shaded with ink outlines, warm, and readable. Think of a picture book of a software studio, not an enterprise dashboard, an empty architectural walkthrough, or neon cyberpunk.

The user should know the building is alive: someone is typing at a terminal, someone is blocked, a review is waiting, and there is sky, city, and greenery outside every window.

Reference: [cubefarm](https://github.com/leonvanzyl/cubefarm) for the toon ramp, ink outlines, sticker UI, terminal monitors, and one floor per project. ForgeVille keeps its own palette, floors, and simulated-only rules.

## Color

Shared tokens live in `src/ui/tokens.ts`. Floor colours live in `src/ui/themes.ts`. Do not scatter hex values through scene objects and CSS without going through one of these.

| Role | Token | Notes |
| --- | --- | --- |
| Ink | `ink #1f1d2b` | Outlines, borders, body text. Never pure black. |
| Paper | `paper #fffdf6` | Panels, stickers, name tags |
| Page | `cream #f6efe2` | Behind the office |
| Accent | per floor (`--fv-accent`) | Chairs, wall stripe, signage, panel headers, pressed buttons |
| Success | `success #2fb37a` | Working, passed, merged |
| Blocked / failed | `danger #e5484d` | Always with an icon and words |
| Waiting | `amber #f5a524` | Awaiting review, simulated tags |
| Review | `review #7c6cf2` | Distinct from success and blocked, always labelled |

Status colours are the same on every floor. Accent text must meet 4.5:1 against the accent; `themes.test.ts` enforces this.

Text in a status colour on paper, or white text on a status fill, uses the deep variant (`successDeep`, `dangerDeep`, `reviewDeep`): the plain fills are too light for it. Every panel text pairing is listed in `PANEL_TEXT_PAIRS` and must meet 4.5:1; `tokens.test.ts` enforces this.

## Building and floors

The office is a building. Every floor shares one floor plan and has its own theme. Projects move in from the ground floor up; a floor without a project is vacant but walkable.

| Level | Theme | Mood | Accent | Materials |
| --- | --- | --- | --- | --- |
| 1 | Workshop | Morning | Sky blue `#4fb3e8` | Honey oak planks, cream walls |
| 2 | Greenhouse | Noon | Teal `#2ec4b6` | Birch, sage walls, hanging planters |
| 3 | Night Studio | Night | Lilac `#c77dff` | Walnut, indigo walls, warm lamps, stars, lit city |
| 4 | Ember Forge | Sunset | Ember `#ff8a5b` | Concrete, copper-brown walls, golden-hour sky |

A new theme needs every field in `FloorTheme` and must pass the contrast test.

## Render style

- **Toon ramp.** `MeshToonMaterial` on a shared three-step ramp (150, 205, 255), one cached material per colour.
- **Ink outlines.** An inverted hull, about 1.6 px wide on screen, on every lit solid. Glows, glass, and light pools have none.
- **Glow, not bloom.** Screens, lamps, and lit windows are unlit (`toneMapped: false`). Light pools are additive quads. No post-processing stack in milestone 0.
- **Outside.** A gradient sky dome with a sun or moon, clouds by day and stars at night, a ground plane one storey lower per level, trees, roads, and a ring of city blocks.
- **Displays.** Monitors, the whiteboard, the QA screen, and the status display paint snapshot data into canvas textures. They are read-only and repaint only when their view model changes.

## Office floor

One compact, fully navigable floor plan, shared by every floor of the building:

1. Reception and project overview.
2. Six to eight developer desks.
3. QA testing corner.
4. Kanban whiteboard.
5. Project status display.
6. Meeting area.
7. Plants, windows, and small decorations.
8. An elevator in reception, for changing floors.

Leave walkable aisles. Interactive objects need a readable approach side. Do not hide the board behind desks.

Each zone has a stable id used by the overview, click-to-travel, and the 2D alternative:

- `reception`
- `desks`
- `qa`
- `board`
- `status`
- `meeting`

## Characters

Six to eight agents per floor, built from primitives. Each has:

- a capsule body and a round head with hair and an animal accessory from its avatar
- a face (eyes, blush, and a mouth that follows the pose) that blinks and breathes
- a name tag (`Name · ISSUE`) with a border in its runtime colour (`src/ui/runtimes.ts`). The tag hides within 2 m of the camera.

There is no custom modelling gate.

Required readable states: working, idle, blocked, awaiting review. Celebration is allowed after a simulated merge.

Status uses icon, text, and shape as well as colour. A floating mark or desk lamp colour is not enough by itself.

Runtimes are told apart by an accent and a glyph, never a vendor logo:

| Runtime | Accent | Glyph |
| --- | --- | --- |
| Claude Code | `#d97757` | ✻ |
| Codex | `#7dd3c0` | › |
| Pi | `#f2c14e` | π |
| OpenCode | `#8fb3ff` | ⌘ |

## Controls

| Input | Action |
| --- | --- |
| WASD or arrows | Move |
| Mouse | Look while pointer is locked |
| Click | Lock pointer, or interact when hovering an object in unlocked mode |
| Shift | Run |
| Escape | Release pointer lock, then close the current panel on a second press if one is open |
| E or click | Interact with the nearby focused object |
| Overview control | Top-down office view |
| Zone list | Travel to a named area |
| 2D alternative | Inspect team and task board without the 3D canvas |
| Floor picker / elevator | Ride to another floor; the visitor keeps their spot in the plan |

Show a contextual hint when an interactive object is nearby, including the key and the object name.

Opening a text input or terminal captures keys so WASD does not move the player.

## Panels

Panels are stickers: paper, a 3–4 px ink border, a hard offset shadow, and a header in the floor accent. Buttons are chunky and press down on click. Fonts are Fredoka for UI and JetBrains Mono for code, both bundled. Panels are readable at laptop widths and stack cleanly on a narrow viewport. They do not cover the only way to close themselves.

Required panel contents are specified in the agent, board, pull-request, and mission-control stories. Do not invent live usage numbers. Usage is clearly labelled mock data.

Terminal transcript includes timestamps and plausible mock output, plus a persistent "Simulated session" label. Every in-world screen carries a `SIMULATED` tag too.

## Motion

Soft ambient motion: typing bursts, breathing, blinking, a blinking terminal cursor, and drifting clouds. Changing floors shows a short arrival banner. Reduced motion disables looping motion and keeps state changes instant.

Loading and error states exist before the canvas is interactive. A WebGL failure still offers the 2D alternative.

## Copy

Short, specific, developer-flavored. Do not say a real process is running. Do not say a merge succeeded if the policy refused it. Blocked actions explain the failed checks or missing approval.
