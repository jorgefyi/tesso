# Docs routes

Docs routes are full-page navigations that show one docs section at a time (`/docs/install`, `/docs/init`, `/docs/check`, `/docs/add`, `/docs/button`, `/docs/card`, `/docs/dialog`) and a not-found page for unknown paths.

## Sub-features

- `docs-nav` opens Install from the top-bar `Docs` link or the hero `Read the docs` CTA.
- `docs-pages` shows the correct `h1` and document title for each known docs path.
- `docs-current` marks the Docs nav link with `aria-current="page"` while on a docs route.
- `docs-404` shows `Page not found` for an unknown path and offers `Back home`.

## How to get to it (user POV)

- Choose `Docs` in the site nav.
- Choose `Read the docs` on the landing hero.
- Open a docs URL directly (`/docs/install`, `/docs/init`, …).
- Open an unknown path to reach not-found.

## Driving it with control-tesso-site

Preconditions:

- Site is healthy at the launched URL with SPA rewrites (`doctor` must pass `/docs/install`).
- Browser context is open.

- **Nav entry.** From `/`, choose Docs. Run `control-tesso-site browser goto /` then `control-tesso-site browser click --role link --name "Docs"`. URL ends with `/docs/install`, title is `Install — Tesso`, and `control-tesso-site browser text --role heading --name "Install"` returns `Install`.
- **Hero entry.** Return home and use the CTA. Run `control-tesso-site browser goto /` then `control-tesso-site browser click --role link --name "Read the docs"`. Same Install end state as above.
- **Direct pages.** Visit each known path and assert heading + title:

  | Path | Heading | Title |
  | --- | --- | --- |
  | `/docs/install` | Install | Install — Tesso |
  | `/docs/init` | Init | Init — Tesso |
  | `/docs/check` | Check | Check — Tesso |
  | `/docs/add` | Add | Add — Tesso |
  | `/docs/button` | Button | Button — Tesso |
  | `/docs/card` | Card | Card — Tesso |
  | `/docs/dialog` | Dialog | Dialog — Tesso |

  For each: `control-tesso-site browser goto <path>`, then `browser text --role heading --name "<Heading>"` and `browser info` (check `title`).
- **Current page.** On any docs route, run `control-tesso-site browser eval --expr "document.querySelector('nav[aria-label=\"Site\"] a[href=\"/docs/install\"]').getAttribute('aria-current')"`. Value is `page`.
- **Not found.** Open a bogus path. Run `control-tesso-site browser goto /docs/nope`. Heading is `Page not found`. Choose `Back home` with `control-tesso-site browser click --role link --name "Back home"`. URL returns to `/`.
- **Proof.** Capture Install and one component page. Run screenshots to `/cursor/stores/bc-e139e1a6-3f39-591d-a24b-dec202a1d280/media/verify-tesso-site/docs-routes/install.png` and `.../button.png`, plus ARIA snapshots alongside.

## Gotchas

- Routing is a full page load, not client pushState. Prefer `browser goto` or real link clicks; do not hide/show sections via eval and call it verified.
- `fusor preview` without the harness server cannot prove docs routes — `doctor` failing on `/docs/install` means the wrong server.
- Registry JSON under `/r/*.json` is a static file, not a docs page; do not confuse it with `/docs/*`.
