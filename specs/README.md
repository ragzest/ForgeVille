# ForgeVille specs

These documents are the backlog for the first playable prototype. Implement them in roadmap order unless a story explicitly says it can run in parallel.

## How to use a story

1. Read the parent epic and the architecture rules the story cites.
2. Implement the smallest change that meets the acceptance criteria.
3. Add or update the tests named in the story.
4. Mark the story status in the story file and in `roadmap.md`.
5. Do not pull the next epic's scope into the same change.

## Status values

- `todo` — not started
- `in-progress` — currently being built
- `done` — acceptance criteria met and verified

## Document index

| Document | Purpose |
| --- | --- |
| [product-brief.md](product-brief.md) | Vision, milestone scope, definition of done |
| [architecture.md](architecture.md) | Modules, state, ports, testing boundaries |
| [design.md](design.md) | Palette, office layout, interaction rules |
| [roadmap.md](roadmap.md) | Ordered epics and stories |
| [epics/](epics/) | Why each increment exists |
| [stories/](stories/) | What to build and how to know it is done |
