# S03-03 — Characters bound to agent presence

Status: todo
Epic: [E03](../epics/E03-office.md)
Depends on: S03-02, S02-02

## Story

As a visitor, I want to see who is working, idle, blocked, or waiting on review without opening a panel.

## Acceptance criteria

- Each desk agent has a simple character with a distinct silhouette or accessory.
- Presence from the domain function selects a pose or short loop: working, idle, blocked, awaiting review, reviewing.
- Blocked and review states include a shape or mark, not color only.
- Changing scenario updates poses from the store. Characters do not call workflow commands.
- Reduced motion uses static poses.
- Celebration pose appears only when the presentation hint is active.

## Verification

- Unit test maps each presence value to a presentation token.
- Manual check that the blocked scenario and the implementing scenario show different poses.

## Out of scope

Pathfinding between rooms. Walking to a desk can be a later polish if the character is already readable. A short idle-in-place walk cycle is optional, not required.
