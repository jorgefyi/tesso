---
name: verify-tesso-site
description: "Drive the Tesso Fusor marketing/docs site (site/) the way a user does — launch a local SPA-aware build, exercise landing, theme, copy, and docs routes, and capture proof. Use for /verify-tesso-site, site UI regression checks, or when a change touches site/ web UI."
---

# Verify Tesso site

Primary surface: the Fusor app in `site/` (landing, docs, theme toggle, install-copy). Secondary surface (out of scope here): the `tesso` / `tesso-ui` CLI. Feature recipes live in [`features/`](features/README.md).

Harness: `control-tesso-site` under this skill. It builds `site/`, serves `site/dist` with the same SPA rewrites as `site/vercel.json` (required — plain `fusor preview` / `fusor dev` return 404 for `/docs/*`), and drives Chromium through Playwright.

## Launch

From the repository root:

```bash
export PATH="$HOME/.fusor/bin:$PATH"
# Optional isolation (two agents must not share port or verify dir):
export RUN_ID="agent-a"
export TESSO_SITE_PORT=44780          # driver uses PORT+1
export TESSO_VERIFY_DIR="/tmp/tesso-site-verify-$RUN_ID"

# One-time tooling if missing:
# curl -fsSL https://fusor.build/install.sh | sh -s -- v0.1.8
# rustup toolchain install 1.95.0 --profile minimal --target wasm32-unknown-unknown

cd .cursor/skills/verify-tesso-site && npm install && cd -
export PATH="$PWD/.cursor/skills/verify-tesso-site/bin:$PATH"

control-tesso-site launch
# Ready when stdout JSON includes "ok": true and url http://127.0.0.1:$TESSO_SITE_PORT
```

What `launch` does:

1. Ensures `fusor` 0.1.8 is on `PATH`.
2. In `site/`: `npm install`, `fusor install`, `fusor build`, `node split-not-found.mjs`.
3. Starts a detached SPA static server for `site/dist` on `TESSO_SITE_PORT` (default `44780`).
4. Writes `$TESSO_VERIFY_DIR/state.json` with `pid`, `url`, `port`, `dist`, `fusorVersion`.
5. Polls until `GET /` returns the landing HTML (brand `Tesso`, headline `Design system starter for Fusor`) and `GET /docs/install` returns HTML (rewrite check).

Skip rebuild when `dist/` is already current: `control-tesso-site launch --skip-build`.

Do not use bare `fusor preview` or `fusor dev` as the verification server: both 404 `/docs/install`. Production Vercel applies `site/vercel.json` rewrites; the harness mirrors those.

Teardown: `control-tesso-site cleanup` (see Cleanup).

## Doctor

```bash
control-tesso-site doctor
```

Read-only. Exit `0` only when all hold:

- `state.json` exists and its server `pid` is alive.
- `GET {url}/` is 200 and body mentions `Tesso`.
- `GET {url}/docs/install` is 200 HTML (proves SPA rewrites and that this is the harness server, not raw fusor preview).

Stdout is JSON. Exit `2` on failure. Run doctor before any drive when something looks off.

## Drive

Put the harness on `PATH`, then:

```bash
control-tesso-site browser open
control-tesso-site browser goto /
control-tesso-site browser click --role button --name "Switch to dark theme"
control-tesso-site browser html-class
control-tesso-site browser screenshot --path "$EVIDENCE/theme-dark.png"
control-tesso-site browser snapshot --aria --path "$EVIDENCE/theme-dark.aria.txt"
```

Stable handles from this site (prefer these over CSS):

| Control | Handle |
| --- | --- |
| Brand home | link name `Tesso` (`a.mark`) |
| Docs nav | link name `Docs` → `/docs/install`, `aria-current="page"` on docs routes |
| Theme | button `Switch to dark theme` / `Switch to light theme` |
| Copy install | button `Copy install command` (writes `npx tesso-ui init`) |
| Live region | `Copied` via `aria-live` after copy |
| Read the docs | link name `Read the docs` → `/docs/install` |
| Docs headings | `h1` text `Install`, `Init`, `Check`, `Add`, `Button`, `Card`, `Dialog` |
| Dialog demo | button `Open dialog` on `/docs/dialog` or `/test`; dialog title `Dialog`; close via `Close` or Escape |

Browser subcommands: `open`, `goto`, `click`, `press`, `wait`, `text`, `eval`, `info`, `screenshot`, `snapshot --aria`, `clipboard`, `storage get|set|clear`, `html-class`, `close`.

The first browser call starts a detached Playwright driver on `port+1`. Later commands reuse that Chromium context. Prefer recipes in [`features/`](features/README.md).

## Evidence

Proof root (survives cleanup):

`/cursor/stores/bc-e139e1a6-3f39-591d-a24b-dec202a1d280/media/verify-tesso-site/`

Override with `TESSO_EVIDENCE_DIR` if needed. Suggested layout:

```
media/verify-tesso-site/<feature-id>/
  before.png
  after.png
  after.aria.txt
  notes.json          # feature id, entry point, commands, observations
```

Proof standards:

- Exercise the real user path (click the copy button; do not call `navigator.clipboard.writeText` yourself as the action under test).
- Capture the action and the resulting state (screenshot/ARIA before and after; for theme, `html-class` + `storage get --key theme`; for copy, `clipboard` + live region text).
- Side effects: `localStorage.theme` for theme; clipboard text `npx tesso-ui init` for copy; document title / visible `h1` for docs routes.
- No mocks. Clipboard needs the Playwright context permission (already granted by the harness).
- Record which feature file and entry point you drove.

## Cleanup

```bash
control-tesso-site cleanup
```

Kills only the server and browser-driver PIDs recorded in `$TESSO_VERIFY_DIR/state.json`, removes that state file / verify dir scratch, and leaves every file under the evidence root untouched. Never kill by process name (`fusor`, `chrome`, …). After a failed iteration, run cleanup before the next launch so ports are free.

Confirm evidence still exists after cleanup:

```bash
ls /cursor/stores/bc-e139e1a6-3f39-591d-a24b-dec202a1d280/media/verify-tesso-site/
```

## Helpers

| Helper | Invocation |
| --- | --- |
| CLI entry | `.cursor/skills/verify-tesso-site/bin/control-tesso-site <cmd>` (or on `PATH`) |
| Launch | `control-tesso-site launch [--skip-build] [--port N]` |
| Doctor | `control-tesso-site doctor` |
| Browser | `control-tesso-site browser <subcommand> …` |
| Cleanup | `control-tesso-site cleanup` |
| Evidence path | `control-tesso-site evidence-root` |

Internal (started by launch / browser open; do not call by hand unless debugging): `_serve`, `_drive-serve`.

Isolation defaults:

- Port `44780` (site) and `44781` (Playwright driver), override with `TESSO_SITE_PORT`.
- State under `/tmp/tesso-site-verify-$RUN_ID`.
- Concurrent agents: distinct `RUN_ID` and `TESSO_SITE_PORT` (leave at least one free port above the site port for the driver).

Maintenance: `/maintain-verification-skill` when routes, labels, or launch steps drift.
