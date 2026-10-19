# S10-02 — Time of day and ambient life

Status: done
Epic: [E10](../epics/E10-living-building.md)
Depends on: S03-04, S09-02

## Story

As a visitor, I want the light and the people to move a little so the office feels lived in, without any of it pretending to be workflow.

## Acceptance criteria

- An optional "Follow the clock" setting interpolates each floor's sky, sun, fog, and exposure between keyframes (night → dawn → noon → golden hour → dusk) from the scenario clock. It is off by default, so each floor keeps its signature mood.
- Idle agents occasionally run a short, deterministic errand: coffee, a stretch, a chat at the meeting table. They always return to their desk. Errands are seeded from agent id and scenario clock, never `Math.random`.
- Working agents type in bursts. Blocked agents sigh. A merge plays a short confetti burst at the author's desk. All of this reads presence; none of it writes.
- Fake sunlight patches through windows on day floors, as additive quads with no extra lights.
- Reduced motion disables errands, confetti, and clock-following transitions.

## Verification

- Unit: the errand schedule is deterministic for a given agent and clock.
- Manual: a 5-minute watch with no console errors and no change to any panel's data.

## Out of scope

Audio. If added later it needs a user gesture and a mute control.
