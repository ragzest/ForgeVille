# S10-03 — Quality tiers and screen glow

Status: todo
Epic: [E10](../epics/E10-living-building.md)
Depends on: S03-04

## Story

As a visitor on a modest laptop, I want the office to stay smooth, and on a strong machine I want screens and lamps to glow softly.

## Acceptance criteria

- Low, medium, and high tiers, plus Auto, selectable in a settings popover and kept in `localStorage`.
  - Low: no outlines on small props, 1024 shadow map, dpr 1.
  - Medium (default): today's look.
  - High: selective glow on screens and lamps, rendered from a dedicated layer so walls never haze. This needs one small dependency (`postprocessing`), recorded in the architecture decision log.
- Auto drops one tier when the frame rate stays under 45 fps for 3 seconds, and says so in a toast.
- Repeated props (chairs, plants, monitors) move to instanced meshes, with outlines that respect the instance matrix.
- Monitor repaints are throttled by distance: none beyond 16 m.

## Verification

- A dev-only frame-time readout behind `?debug=perf`.
- A manual pass on the four floors at each tier.

## Out of scope

WebGPU.
