# Tesso site verification map

This directory is the maintained source for verifying the user-facing behavior of the Tesso Fusor site in `site/`. Read the index before driving the app, then use the matching feature file as the recipe.

## Baseline preconditions

- Launch with `control-tesso-site launch` so the SPA rewrite server owns `http://127.0.0.1:$TESSO_SITE_PORT` (default `44780`).
- Set `RUN_ID` / `TESSO_VERIFY_DIR` and a unique `TESSO_SITE_PORT` when another agent may be verifying at the same time.
- Put `.cursor/skills/verify-tesso-site/bin` on `PATH` (after `npm install` in that skill directory).
- Run `control-tesso-site doctor` and require `ok: true`, the expected URL, and a healthy `/docs/install` rewrite.
- Never drive an instance that was not started by this verification run.
- Start theme-sensitive journeys from a known theme: `control-tesso-site browser storage clear` then `browser goto /` (or set `theme` explicitly).

## Driving conventions

- Start every recipe from the baseline state unless its preconditions say otherwise.
- Prefer ARIA roles and accessible names over CSS selectors or DOM position.
- Treat every command as literal. Keep quoted names and flags unchanged.
- Run browser actions through `control-tesso-site browser`.
- Restore theme / clipboard expectations after a mutation when the next recipe needs a clean baseline. Do not remove proof artifacts during cleanup.

## Proof and skip reporting

- Capture the user action and the resulting state, not only the final screen.
- UI proof includes an ARIA snapshot and a screenshot with the Tesso brand visible.
- Mutation proof includes a second read of stored or clipboard state.
- Record the feature ID and entry point used with every artifact.
- Report an unreachable path with the attempted command and the unmet precondition.
- Do not report a skipped entry point as verified through a different path.

## Feature entry contract

Each feature file starts with an H1 title and one paragraph describing the user-visible behavior. It then uses exactly four H2 sections in this order.

1. `Sub-features` lists short IDs with one line for each behavior.
2. `How to get to it (user POV)` lists every user entry point.
3. `Driving it with control-tesso-site` starts with `Preconditions:` and uses labeled bullets that pair each user action with an exact command and observable result.
4. `Gotchas` lists traps that can waste or invalidate a verification run.

Keep implementation details out of the map. Name only user paths, stable handles, required state, commands, and observable proof.

## Features

- [Landing](./landing.md) covers the first viewport brand, headline, hero actions, and Why Tesso section.
- [Theme toggle](./theme-toggle.md) covers light/dark switching, persistence, and FOUC script behavior.
- [Copy install command](./copy-install-command.md) covers copying `npx tesso-ui init` from the hero.
- [Docs routes](./docs-routes.md) covers full-page navigation across install/init/check/add/components and 404.
- [Dialog demo](./dialog-demo.md) covers opening and dismissing the docs Dialog example.
