# Theme toggle

Theme toggle flips the site between light and dark by toggling the `.dark` class on `<html>` and persisting `theme` in `localStorage`.

## Sub-features

- `theme-to-dark` switches from light to dark from the top-bar control.
- `theme-to-light` switches from dark back to light.
- `theme-persist` keeps the choice across a full navigation / reload.
- `theme-label` exposes the next action as the accessible name (`Switch to dark theme` / `Switch to light theme`).

## How to get to it (user POV)

- Choose the theme button in the top bar on any page (landing or docs).

## Driving it with control-tesso-site

Preconditions:

- Site is healthy at the launched URL.
- Start from light: `control-tesso-site browser open`, `control-tesso-site browser storage clear`, `control-tesso-site browser goto /`.
- `control-tesso-site browser html-class` does not list `dark`.
- Theme button name is `Switch to dark theme`.

- **Switch to dark.** Choose the theme control. Run `control-tesso-site browser click --role button --name "Switch to dark theme"`. `control-tesso-site browser html-class` includes `dark`, and `control-tesso-site browser storage get --key theme` returns `dark`. The button name becomes `Switch to light theme`.
- **Capture dark.** Run `control-tesso-site browser screenshot --path /cursor/stores/bc-e139e1a6-3f39-591d-a24b-dec202a1d280/media/verify-tesso-site/theme-toggle/dark.png` and `control-tesso-site browser snapshot --aria --path /cursor/stores/bc-e139e1a6-3f39-591d-a24b-dec202a1d280/media/verify-tesso-site/theme-toggle/dark.aria.txt`.
- **Persist across navigation.** Open docs then return. Run `control-tesso-site browser goto /docs/install` and `control-tesso-site browser goto /`. `html-class` still includes `dark` and storage `theme` is still `dark`.
- **Switch to light.** Choose the control again. Run `control-tesso-site browser click --role button --name "Switch to light theme"`. `html-class` has no `dark`, storage `theme` is `light`, and the button name returns to `Switch to dark theme`.
- **Proof.** Capture light after the round trip. Run `control-tesso-site browser screenshot --path /cursor/stores/bc-e139e1a6-3f39-591d-a24b-dec202a1d280/media/verify-tesso-site/theme-toggle/light.png`. Notes JSON should record both classList and storage values.

## Gotchas

- The FOUC script only auto-applies stored `dark` (not OS `prefers-color-scheme`). Clearing storage yields light even if the OS is dark.
- Accessible name changes with state. Always click by the current next-action label.
- Class on `<html>` alone is insufficient if storage disagrees; assert both after a mutation.
- Theme is shared across routes via `localStorage`. Reset with `browser storage clear` between independent journeys.
