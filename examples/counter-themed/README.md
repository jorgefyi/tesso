# Shift counter

A Fusor 0.1.6 app that shows how Tesso lands in a real project. Dependencies are `fusor-core`, `fusor-components`, and `fusor-build` 0.1.6 from crates.io. `Cargo.toml` sets `assets = { "/" = "public" }` and `tailwind = "web/app.css"`. The counter uses copied Button, Card, and Dialog components. Light values are on `:root`. Dark values are on `.dark`.

`public/tokens.css` is the token file this app owns, and `public/tesso.css` is the copied component CSS. Both are committed. A copy of this folder still has a theme if Node is not installed.

## What is wired

`Cargo.toml` sets:

```toml
assets = { "/" = "public" }
tailwind = "web/app.css"
```

`web/app.css` imports Tailwind and holds the `/* tesso:theme */` `@theme inline` block, so `bg-primary` follows `--primary` and therefore `.dark`. `web/index.html` links `/tokens.css`, `/tesso.css`, and `/app.css`. Fusor injects the compiled Tailwind stylesheet. Before first paint, a script adds `.dark` when `localStorage` says `dark`, or when nothing is stored and the OS preference is dark. `tokens.css` does not read `prefers-color-scheme`. `ThemeToggle` (`src/theme_toggle.rs`) uses `class:name` for the pressed state. `src/theme.rs` toggles `.dark` on `<html>` and stores the choice.

The page components were copied with `tesso add button card dialog`:

- `web/components/button.html` and `src/button.rs`
- `web/components/card.html` and `src/card.rs`
- `web/components/dialog.html`, `src/dialog.rs`, and `src/dialog_a11y.rs`

`src/app.rs` imports `Button`, `Card`, and `Dialog`. The card body is the default child. A `<template slot="footer">` fills `<Children name="footer">` on the card and on each dialog. Reset opens a dialog. Why, inside that dialog, opens a second one on top. Because that click opens one dialog from another, Escape closes only the top dialog. Cancel, the close button, a click outside the panel, and Escape set that dialog's signal to false. Confirm sets the count to zero and closes. Focus returns to the control that opened the dialog.

Named children and the optional `aria-labelledby` / `aria-describedby` attributes need Fusor 0.1.6 or newer. Button, Card, and Dialog all build on that release.

## Commands

From the repo root:

```bash
npm install
node bin/tesso.js check --cwd examples/counter-themed
npm run preview
```

Open http://127.0.0.1:44731 and switch Light / Dark. The page reads the same `public/tokens.css` Fusor would copy. The preview is a static stand-in of the three components. Tailwind utilities such as `bg-primary` appear after `fusor build`.

From this folder, after `npm install` here (the `file:../..` dependency) and the Fusor 0.1.6 CLI:

```bash
npx tesso-ui check
fusor install
fusor dev
```

Rust 1.95 and the `wasm32-unknown-unknown` target match `rust-toolchain.toml`.

## Edit a color

Change a value in `public/tokens.css` and reload. Light and dark colors both live in that file. `--radius` stays on `:root`. Captions use `--muted-foreground`. `tesso check` reports a missing token, a value that is not `oklch()`, and a foreground/background pair below WCAG AA 4.5:1.

## Without Rust

`npm run preview` is a static stand-in so the CSS variables and the three components can be checked without the Fusor CLI.
