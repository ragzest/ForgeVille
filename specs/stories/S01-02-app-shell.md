# S01-02 — App shell, loading, and WebGL fallback

Status: todo
Epic: [E01](../epics/E01-foundation.md)
Depends on: S01-01

## Story

As a user, I want the app to tell me it is starting, and to offer a non-3D path if WebGL cannot start, so the product is never a blank page.

## Acceptance criteria

- Document title is ForgeVille.
- Initial render shows a loading state before the main view is marked ready.
- A forced error state shows a short message and a way to retry the shell. This can be triggered by a test-only query such as `?shell=error`.
- If WebGL is unavailable, the shell shows that the 3D office cannot start and renders an empty 2D region labelled for the team and board. Those regions can be placeholders until E04 and E06.
- The shell has a landmark structure: a main region and a place for overlays. Overlay container does not trap focus when empty.
- Reduced-motion preference is read once and stored for later stories. No animation is required yet.

## Verification

- Component or Playwright test for the error query and the no-WebGL message. WebGL detection may be stubbed.

## Out of scope

Office meshes, real metrics, navigation controls.
