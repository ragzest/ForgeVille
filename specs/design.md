# Design constraints

Status: binding for visual and interaction stories.

## Feel

Cozy life-simulation office, low poly, warm and premium. Not a generic enterprise dashboard, not an empty architectural walkthrough, not neon cyberpunk.

The user should know the room is alive: someone is working, someone is blocked, a review is waiting, a plant and a window keep the room from feeling like a tool chrome mock.

## Color

| Role | Direction |
| --- | --- |
| Primary | Dark forest green, emerald |
| Success | Mint green |
| Surfaces | Warm ivory, soft grey, charcoal |
| Panels | Layered, restrained glass |
| Danger / blocked | A clear warm red or amber used with an icon and text, never color alone |
| Review | Distinct from success and blocked, with a label |

Put tokens in one module when UI work starts. Do not scatter hex values through scene objects and CSS independently without a shared source.

## Office floor

One compact, fully navigable floor:

1. Reception and project overview.
2. Six to eight developer desks.
3. QA testing corner.
4. Kanban whiteboard.
5. Project status display.
6. Meeting area.
7. Plants, windows, and small decorations.

Leave walkable aisles. Interactive objects need a readable approach side. Do not hide the board behind desks.

Each zone has a stable id used by the overview, click-to-travel, and the 2D alternative:

- `reception`
- `desks`
- `qa`
- `board`
- `status`
- `meeting`

## Characters

Six to eight agents. Simple customizable silhouettes are enough. No custom modelling gate.

Required readable states: working, idle, blocked, awaiting review. Celebration is allowed after a simulated merge.

Status uses icon, text, and shape as well as color. A floating mark or desk lamp color is not enough by itself.

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

Show a contextual hint when an interactive object is nearby, including the key and the object name.

Opening a text input or terminal captures keys so WASD does not move the player.

## Panels

Panels are glass overlays, readable at laptop widths and stacked cleanly on a narrow viewport. They do not cover the only way to close themselves.

Required panel contents are specified in the agent, board, pull-request, and mission-control stories. Do not invent live usage numbers. Usage is clearly labelled mock data.

Terminal transcript includes timestamps and plausible mock output, plus a persistent "Simulated session" label.

## Motion

Soft ambient motion: monitors, plants, status ticks. Reduced motion disables looping motion and keeps state changes instant.

Loading and error states exist before the canvas is interactive. A WebGL failure still offers the 2D alternative.

## Copy

Short, specific, developer-flavored. Do not say a real process is running. Do not say a merge succeeded if the policy refused it. Blocked actions explain the failed checks or missing approval.
