# Instructions for agents

## Mission and source of truth

Build Voxel as a small, polished, browser-based god game. Read `SPEC.md` before changing gameplay or interaction rules. Keep the world itself as the primary screen.

## Required workflow

1. Inspect `git status` before editing and preserve unrelated user changes.
2. Make the smallest coherent change that satisfies the request.
3. Add or update tests when changing deterministic world behavior.
4. Run `npm test` and `npm run build` before completing work.
5. Commit completed work with a descriptive message and push it to `origin` so changes are never left only on the local machine. The normal deployment branch is `main`.
6. Check the GitHub Pages workflow after a push that changes production behavior. Fix deployment failures before declaring the work complete.

Do not force-push, rewrite shared history, discard user changes, commit generated `dist/`, or bypass a failing test or build.

## Product invariants

- Keep coordinates integer-aligned and prevent more than one block per cell.
- Preserve stable block IDs when gravity moves a block.
- A structure is supported only when its face-connected component reaches the build plane.
- Settling must preserve the shape of a disconnected block group.
- Validate locally saved worlds before rendering them.
- Left-click edits the world. Right-click drag rotates around its center. Do not make those controls compete.
- Keep pointer controls, visible states, and accessible labels in sync.

## Architecture

- Put pure, renderer-independent game rules in `src/game/` and cover them with Vitest.
- Keep Three.js scene interaction and React application state in `src/Game.tsx` until a clear feature boundary justifies extraction.
- Use the shared material and world constants in `src/game/world.ts`; do not duplicate them in UI code.
- Prefer targeted dependencies and browser-native features over new frameworks or services.

## Hosting constraint

GitHub Pages is the only supported runtime and hosting service. Production must remain a static Vite build with the `/voxel/` base path. Do not add server-only code, secret-dependent features, Cloudflare, Vercel, Netlify, or OpenAI Sites deployment configuration. Deployment belongs in `.github/workflows/deploy.yml`.
