# Landing

Landing is the `/` first viewport: brand mark, one headline, supporting sentence, install command with copy, and Read the docs — plus the Why Tesso section below the fold.

## Sub-features

- `landing-brand` shows the Tesso mark as a home link in the top bar.
- `landing-hero` shows headline `Design system starter for Fusor` and the supporting subcopy.
- `landing-cta` exposes Copy install command and Read the docs.
- `landing-why` lists the three Why Tesso points under an `h2`.

## How to get to it (user POV)

- Open `/` in the browser.
- Choose the `Tesso` mark from any page.

## Driving it with control-tesso-site

Preconditions:

- Site is healthy at the launched URL.
- `control-tesso-site doctor` reports `ok: true`.

- **Open home.** Load the landing page. Run `control-tesso-site browser open` and `control-tesso-site browser goto /`. Document title is `Tesso` and the URL path is `/`.
- **Brand.** Confirm the mark. Run `control-tesso-site browser text --role link --name "Tesso"`. Text is `Tesso`.
- **Headline.** Confirm the hero. Run `control-tesso-site browser text --role heading --name "Design system starter for Fusor"`. Text matches that headline.
- **CTAs.** Confirm both hero actions. Run `control-tesso-site browser wait --role button --name "Copy install command"` and `control-tesso-site browser wait --role link --name "Read the docs"`. Both are visible.
- **Why section.** Scroll is not required for assertion via role. Run `control-tesso-site browser text --role heading --name "Why Tesso"`. Text is `Why Tesso`.
- **Proof.** Capture the first viewport. Run `control-tesso-site browser screenshot --path /cursor/stores/bc-e139e1a6-3f39-591d-a24b-dec202a1d280/media/verify-tesso-site/landing/hero.png` and `control-tesso-site browser snapshot --aria --path /cursor/stores/bc-e139e1a6-3f39-591d-a24b-dec202a1d280/media/verify-tesso-site/landing/hero.aria.txt`. Artifacts show the brand, headline, and both CTAs.

## Gotchas

- The brand must remain a hero-level signal; asserting only the nav without the headline is incomplete.
- `Read the docs` is a full navigation to `/docs/install`. Return with `browser goto /` before proving landing again.
- Do not treat the `/test` page as the landing surface.
