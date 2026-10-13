# Shift counter

A Fusor app that shows how Tesso lands in a real project. It tracks Fusor `main` (the next release after 0.1.5): git dependencies, `assets = { "/" = "public" }`, `tailwind = "web/app.css"`, named children, and optional attributes. The counter uses copied Button, Card, and Dialog components plus CSS variables. Light values are on `:root`. Dark values are on `.dark`.

`public/tokens.css` and `public/tesso.css` are generated or copied and committed. A copy of this folder still has a theme if Node is not installed. `assets-build` refreshes `tokens.css` when you run `fusor build` or `fusor dev`.

## What is wired

`Cargo.toml` sets:

```toml
assets = { "/" = "public" }
assets-build = ["npx", "tesso-ui", "build"]
tailwind = "web/app.css"
```

`web/app.css` imports Tailwind and holds the `/* tesso:theme */` `@theme inline` block, so `bg-primary` follows `--primary` and therefore `.dark`. `web/index.html` links `/tokens.css`, `/tesso.css`, and `/app.css`. Fusor injects the compiled Tailwind stylesheet. Before first paint, a script adds `.dark` when `localStorage` says `dark`, or when nothing is stored and the OS preference is dark. `tokens.css` does not read `prefers-color-scheme`. `ThemeToggle` (`src/theme_toggle.rs`) uses `class:name` for the pressed state. `src/theme.rs` toggles `.dark` on `<html>` and stores the choice.

The page components were copied with `tesso add button card dialog`:

- `web/components/button.html` and `src/button.rs`
- `web/components/card.html` and `src/card.rs`
- `web/components/dialog.html`, `src/dialog.rs`, and `src/dialog_a11y.rs`

`src/app.rs` imports `Button`, `Card`, and `Dialog`. The card body is the default child. A `<template slot="footer">` fills `<Children name="footer">` on the card and on each dialog. Reset opens a dialog. Why, inside that dialog, opens a second one on top. Because that click opens one dialog from another, Escape closes only the top dialog. Cancel, the close button, a click outside the panel, and Escape set that dialog's signal to false. Confirm sets the count to zero and closes. Focus returns to the control that opened the dialog.

Named children and the optional `aria-labelledby` / `aria-describedby` attributes need Fusor main. Button alone still builds on Fusor 0.1.5.

## Commands

From the repo root:

```bash
npm install
node bin/tesso.js check --cwd examples/counter-themed
node bin/tesso.js build --cwd examples/counter-themed
npm run preview
```

Open http://127.0.0.1:44731 and switch Light / Dark. The page reads the same `public/tokens.css` Fusor would copy. The preview is a static stand-in of the three components. Tailwind utilities such as `bg-primary` appear after `fusor build`.

From this folder, after `npm install` here (the `file:../..` dependency) and a Fusor CLI built from `main`:

```bash
npx tesso-ui build
fusor install
fusor dev
```

Install that CLI with `cargo install --git https://github.com/fusor-rs/fusor fusor-cli`. Rust 1.95 and the `wasm32-unknown-unknown` target match `rust-toolchain.toml`.

## Edit a color

Change `palette-accent.9` in `tokens/color.tokens.json`, run `tesso build`, and reload. On Fusor main, `fusor dev` rebuilds once for that edit. Light semantic colors live in `tokens/semantic.tokens.json`. Dark overrides live only in `tokens/themes/dark.tokens.json`. `warning` is the badge fill; warning text uses `warning-foreground`. Light `subtle-foreground` is about 3.5:1 on `background` and is not for body text.

## Without Rust

`npm run preview` is a static stand-in so the CSS variables and the three components can be checked without the Fusor CLI.
