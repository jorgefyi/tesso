# Tesso

[![npm](https://img.shields.io/npm/v/tesso-ui)](https://www.npmjs.com/package/tesso-ui)
[![license: MIT](https://img.shields.io/badge/license-MIT-blue)](LICENSE)

Tesso is a CLI that copies accessible components and plain CSS design tokens into your [Fusor](https://github.com/fusor-rs/fusor) project, so you own and edit the code. Those tokens are a CSS file, `public/tokens.css`. The npm package is `tesso-ui`. The binary is `tesso`.

The token file uses 19 plain CSS variables, with no `--tesso-` prefix, including `--background`, `--foreground`, `--primary`, and `--radius`. Values are raw `oklch()` on `:root` and `.dark`. The same file works with or without Tailwind. When the Fusor app sets `tailwind`, `tesso init` writes an `@theme inline` bridge so utilities such as `bg-primary` follow `.dark`.

Tesso requires [Fusor](https://github.com/fusor-rs/fusor) 0.1.6 or newer. That release has the assets map, the `tailwind` key, named children, and optional attributes that Card and Dialog use.

## Quick start

```bash
npm install --save-dev tesso-ui
npx tesso-ui init
npx tesso-ui add button
fusor dev
```

Then add the stylesheets to `<head>`:

```html
<link rel="stylesheet" href="/tokens.css" />
<link rel="stylesheet" href="/tesso.css" />
```

`npx tesso-ui` and `tesso` run the same binary.

## Install

Node 20 or newer is required. Rust apps stay Node-free until they opt in with `init`. Quick start installs `tesso-ui`.

## Use

From a Fusor app root:

```bash
npx tesso-ui init
```

`init` writes:

- `tesso.config.json`
- `public/tokens.css`, once, with the 19 starter tokens. If that file already exists, `init` leaves it alone. `--force` replaces it with the starter values
- an npm devDependency on `tesso-ui`
- `[package.metadata.fusor]` key `assets = { "/" = "public" }` when `assets` is missing. An existing `assets = "public"` string is left as it is; Fusor 0.1.6 wants the map
- an `@theme inline` block in the stylesheet named by `tailwind`, when that key is set

It does **not** call `fusor add`. Add the `/tokens.css` and `/tesso.css` stylesheets from Quick start to `<head>`.

To change a color, edit it in `public/tokens.css`, then check the file:

```bash
npx tesso-ui check
```

`check` reads that CSS file. Every required token must be present on `:root`, and every color on `.dark`. Color values must be `oklch()` or a `var()` that resolves to one. `--radius` must be a length or a `var()`. These foreground and background pairs must meet WCAG AA 4.5:1 in both themes:

| foreground | background |
| --- | --- |
| `--foreground` | `--background` |
| `--card-foreground` | `--card` |
| `--popover-foreground` | `--popover` |
| `--primary-foreground` | `--primary` |
| `--secondary-foreground` | `--secondary` |
| `--muted-foreground` | `--muted` |
| `--accent-foreground` | `--accent` |
| `--primary-foreground` | `--destructive` |

The last pair is the danger button, which has no `--destructive-foreground`. A failure names the token and the theme and exits non-zero. `check` does not write the file.

Commit `public/tokens.css`. Fusor copies `public/` as it is. There is no token build step.

## Components

```bash
npx tesso-ui list
npx tesso-ui add button card dialog
```

`add` copies each component's HTML and Rust into the app, appends its CSS to `public/tesso.css`, declares the module in `src/lib.rs`, and adds a `use` in `src/app.rs` when those files exist. It also links `/tesso.css` after `/tokens.css` when that link is missing. It prints what it wrote and a short wiring snippet.

It does not replace a file that is already there unless you pass `--overwrite`. If any requested component already has a file, `add` writes none of that component's files and exits 1. A dependency that is already complete is left in place. An unknown name writes nothing.

Components require `"prefix": ""`. They read plain variables such as `--primary`. `tesso add` refuses a non-empty prefix. Their CSS is wrapped in `@layer components`, so a utility class on the same element overrides the component rule without `!important`. Tailwind's layer order is theme, base, components, utilities.

Card and Dialog use a named `footer` child (`<Children name="footer">`, filled with `<template slot="footer">`). Named children shipped in Fusor 0.1.6. Spacing, type, and shadows in the component CSS are literals. The rules read only the tokens in the starter set.

The parent module that owns the page template must import each component (`use crate::button::Button`). HTML files do not import each other. Component tags are PascalCase and need an explicit closing tag. They sit inside a native HTML element.

### Button

```html
<Button variant="primary" size="md" on_press="{{ state.save.clone() }}">Save</Button>
```

`variant` is `primary`, `secondary`, `quiet`, or `danger`. `size` is `sm`, `md`, or `lg`. Both are `&'static str` literals. `on_press` is `Rc<dyn Fn()>`. Fusor component tags cannot take `on:click` (that attribute is only for native elements), so the copied button calls `on:click` on its own `<button>` and the page passes the callback. Keyboard focus draws a ring from `--ring`. There's no `--destructive-foreground`; the danger button uses `--primary-foreground` for its text. That color is light on the light-theme destructive fill and dark on the lighter dark-theme fill.

### Card

```html
<Card title="Shift" description="A short line under the title.">
  <!-- body -->
  <template slot="footer">
    <p class="meta">Last reset just now</p>
  </template>
</Card>
```

`title` and `description` are `&'static str`. An empty string hides that line. The default `<Children>` slot is the body. `<template slot="footer">` fills the footer.

### Dialog

```html
<Dialog
  open="{{ state.dialog_open.clone() }}"
  title="Reset the counter?"
  description="This sets the count back to zero."
>
  <p>Body copy stays in the default slot.</p>
  <template slot="footer">
    <Button variant="quiet" size="md" on_press="{{ state.cancel.clone() }}">Cancel</Button>
  </template>
</Dialog>
```

`open` is a `Signal<bool>` the page owns. Closing the dialog, including Escape and a backdrop click, sets it back to false. `title` and `description` are static strings. An empty title or description hides that line and omits `aria-labelledby` or `aria-describedby`. Those attributes are `Option<&str>`, so Fusor 0.1.6 removes them when the value is `None`. The `hidden` flag is a `bool`.

The component renders a native `<dialog>` and calls `showModal()` while `open` is true, and `close()` when it becomes false. The browser then:

- traps focus inside the topmost dialog
- closes only that dialog on Escape when one dialog opens another, so the dialog underneath stays open
- makes the rest of the page inert
- paints the dialog in the top layer, so a parent with `transform` or `overflow` cannot clip it or bury it

The element sets `role="dialog"`, `aria-modal="true"`, `aria-labelledby`, and `aria-describedby`. `::backdrop` uses `--foreground`. A click on the dialog outside the panel sets `open` to false, and so does the Close button.

Focus returns to the control that opened the dialog. Safari and Firefox do not focus a button on click, and the browser would put focus back on `<body>`, so Dialog records the `pointerdown` target and uses it when the focused element is `<body>` or `<html>`.

The browser gives each modal dialog its own close watcher when a user gesture opens it. A button inside one dialog opening the next is that gesture, so Escape closes only the top dialog. Two dialogs opened with no new gesture between them share a watcher group, and one Escape closes the group.

Fusor has no element ref. `dialog.rs` looks up `[data-tesso-dialog]` once when `open` becomes true. If that node is not mounted yet, it tries again on the next turn, not on a polling timer. Which dialog is on top, which element is the opener, and whether the page behind is inert live in `dialog_a11y.rs` and are covered by `cargo test`. `add dialog` adds the `web-sys` features this uses (`HtmlDialogElement`, `HtmlElement`, `Node`, and the listener types). fusor-core does not enable them.

## Fusor wiring

```toml
[package.metadata.fusor]
entry = "web/index.html"
assets = { "/" = "public" }
tailwind = "web/app.css"
output = "dist"
base-path = "/"
```

Fusor 0.1.6 wants `assets` as a map and accepts `tailwind`. `tesso init` writes the map when `assets` is missing, and leaves a string that is already there.

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <script>
      (function () {
        try {
          var stored = localStorage.getItem("theme");
          var dark =
            stored === "dark" ||
            (stored !== "light" &&
              window.matchMedia("(prefers-color-scheme: dark)").matches);
          if (dark) document.documentElement.classList.add("dark");
        } catch (e) {}
      })();
    </script>
    <link rel="stylesheet" href="/tokens.css" />
    <link rel="stylesheet" href="/tesso.css" />
    <link rel="stylesheet" href="/app.css" />
    <title>My Fusor App</title>
  </head>
  <body>
    <App state="{{ App::new() }}">
      <!-- your markup and components -->
    </App>
  </body>
</html>
```

`tokens.css` puts light values on `:root` and dark values on `.dark`. It does not contain `prefers-color-scheme`. Put `.dark` on `<html>` in the app. The snippet above applies a stored choice, or the OS setting, before first paint. An explicit `light` choice stays light even when the OS is dark. Use Fusor `class:name` for component state, not for the theme switch. See `examples/counter-themed` for the Cargo metadata, the HTML links, a FOUC script, and a Rust `ThemeToggle` component.

`--radius` stays on `:root`. Body copy uses `foreground` or `muted-foreground`. Component spacing, type, and shadows are literals in the component CSS, not tokens.

```css
body {
  margin: 0;
  background: var(--background);
  color: var(--foreground);
  font: 400 0.875rem/1.5 system-ui, sans-serif;
}
```

## Config

`tesso.config.json` matches `schema.json`:

```json
{
  "$schema": "./node_modules/tesso-ui/schema.json",
  "outFile": "public/tokens.css",
  "prefix": ""
}
```

`prefix` is empty by default, so the custom property is `--background`. There is no `--tesso-` prefix. A prefix `brand` emits `--brand-background` when `init` writes the file. Light is `:root`. Dark is `.dark`.

`outFile` is the CSS file the project owns. `init` writes it when it is missing. `check` reads it.

An optional `registry` key is an `http` or `https` URL. `add` and `list` reject it for now and tell you the built-in document has the same shape. Omit the key to use the registry shipped in the package (`registry/registry.json`, `registryUrl: null`).

## Tokens

The starter is these 19 tokens. Values are raw `oklch()` (and `0.625rem` for radius). Light is `:root`. Dark is `.dark`. There is no `--destructive-foreground`.

`--background`, `--foreground`, `--card`, `--card-foreground`, `--popover`, `--popover-foreground`, `--primary`, `--primary-foreground`, `--secondary`, `--secondary-foreground`, `--muted`, `--muted-foreground`, `--accent`, `--accent-foreground`, `--destructive`, `--border`, `--input`, `--ring`, `--radius`.

`--accent` is the subtle hover surface. `--primary` is the brand fill. `--ring` is a different color from `--primary`, so focus is not the same as the primary fill. `--muted-foreground` is for captions and metadata. Body copy uses `--foreground`.

These names stay outside Tailwind's theme namespaces (`--color-*`, `--font-*`, `--text-*`, `--spacing`, `--spacing-*`, `--radius-*`, `--shadow-*`, and the rest). Components use `var(--radius)` and `calc(var(--radius) - 2px)` so corners work when Tailwind is not installed. Spacing, type, and shadows in Button, Card, and Dialog are plain `rem` and shadow literals.

## Tailwind bridge

If `[package.metadata.fusor]` contains `tailwind = "web/app.css"`, `tesso init` writes this into that file (creating it, with `@import "tailwindcss"`, when it is missing). A later `init` replaces the block marked `/* tesso:theme */` and leaves the rest of the file alone.

```css
/* tesso:theme */
@theme inline {
  --color-background: var(--background);
  --color-primary: var(--primary);
  /* one --color-* line for each semantic color */
  --radius-sm: calc(var(--radius) - 4px);
  --radius-md: calc(var(--radius) - 2px);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) + 4px);
}
```

`--color-primary` points at `--primary`, and `--primary` changes under `.dark`, so `bg-primary` changes with the class. Every kept color is bridged the same way. A project with no `tailwind` key is left alone: the token file does not depend on Tailwind.

The `tailwind` key and Tailwind 4 (`fusor install` downloads it) shipped in Fusor 0.1.6.

## Registry

Each item names its files, the path they are copied to, CSS appended to `public/tesso.css`, Rust modules, component dependencies, and the token names the CSS needs. `dialog` depends on `button` and asks for the `web-sys` features `showModal()` uses, including `HtmlDialogElement`. A later release can fetch this document from a URL without changing the item shape.

## Renaming old `--ft-*` variables

`tesso init --migrate` renames `--ft-*` variables that have a matching token. Any other `--ft-*` name is left as it is, and `init` lists it.

```bash
npx tesso-ui init --migrate
```

The rewrite covers `.css`, `.html`, `.rs`, `.js`, `.mjs`, and `.md` files, and skips `node_modules`, `target`, `dist`, `.git`, `.tmp`, and hidden directories. Names with a matching token:

| `--ft-*` | kept token |
| --- | --- |
| `--ft-color-bg` | `--background` |
| `--ft-color-fg` | `--foreground` |
| `--ft-color-bg-subtle` | `--card` |
| `--ft-color-bg-muted` | `--muted` |
| `--ft-color-fg-muted` | `--muted-foreground` |
| `--ft-color-border` | `--border` |
| `--ft-color-accent` | `--primary` |
| `--ft-color-accent-fg` | `--primary-foreground` |
| `--ft-color-danger` | `--destructive` |
| `--ft-color-focus-ring` | `--ring` |

`--ft-color-accent-9` stays `--ft-color-accent-9`, because the rewrite does not consume a longer name. There is no `--tesso-*` step. Without `--migrate`, `init` does not rename anything.

## Try the example

```bash
npm install
npm test
npm run preview
```

`npm run preview` serves [`examples/counter-themed`](examples/counter-themed) at `http://127.0.0.1:44731` (set `PORT` to change it). The page toggles `.dark` against the committed `public/tokens.css` and shows Button, Card, and Dialog. Reset opens the dialog. Escape closes it and returns focus to Reset. The preview is static CSS, so `bg-primary` is only visible after `fusor build` compiles `web/app.css`.

## Non-goals

No multi-brand themes, no Figma sync, no Rust token runtime, and no crates.io Fusor capability. Tokens are a CSS file you edit. The registry is bundled; a remote URL is reserved and not fetched yet. The surface is intentionally small for Fusor pre-1.0.

## Contributing

Issues and pull requests are welcome on [GitHub](https://github.com/jorgefyi/tesso/issues). To work on the CLI itself:

```bash
npm install
node bin/tesso.js --help
npm test
```

Tesso requires Fusor 0.1.6 or newer. Fusor is still pre-1.0.

- [fusor-rs/fusor#20](https://github.com/fusor-rs/fusor/issues/20) — `assets-build` is an argv array, not a shell command. The clearer error for a bad value is fixed in Fusor 0.1.6. Tesso does not set `assets-build`.
- [fusor-rs/fusor#21](https://github.com/fusor-rs/fusor/issues/21) — `fusor dev` running an assets hook twice is fixed in Fusor 0.1.6.
- [fusor-rs/fusor#22](https://github.com/fusor-rs/fusor/issues/22) — a Rust char literal such as `'dark'` inside a template being reported as invalid Rust tokens is fixed in Fusor 0.1.6. The example still uses a double-quoted string inside a single-quoted HTML attribute.
- [fusor-rs/fusor#24](https://github.com/fusor-rs/fusor/issues/24) — still open. `fusor add` cannot copy component source, so `tesso add` does it.
- [fusor-rs/fusor#25](https://github.com/fusor-rs/fusor/issues/25) — still open. Component tags cannot take `on:click`. Pass a callback input, or put the listener on a native element inside the component.
- [fusor-rs/fusor#26](https://github.com/fusor-rs/fusor/issues/26) — a component template being limited to one native HTML root is fixed in Fusor 0.1.6 (multiple template roots). Dialog's root is still the `<dialog>` element, and the dimmed page is `::backdrop`.
- [fusor-rs/fusor#27](https://github.com/fusor-rs/fusor/issues/27) — still open. There is no element ref. Dialog finds its `<dialog>` with `[data-tesso-dialog]` once when it opens. The same issue covers `web-sys`: fusor-core doesn't enable `HtmlDialogElement`, `HtmlElement`, `Node` or `EventTarget`, so `add dialog` adds them.
- [fusor-rs/fusor#28](https://github.com/fusor-rs/fusor/issues/28) — `<Children>` appearing once per component is fixed in Fusor 0.1.6 (named children). Card and Dialog use `<Children name="footer">`.
- [fusor-rs/fusor#29](https://github.com/fusor-rs/fusor/issues/29) — still open. `fusor build` doesn't download its tools. On a fresh machine it exits until you run `fusor install`.
- [fusor-rs/fusor#52](https://github.com/fusor-rs/fusor/issues/52) — a component `#[input]` is still a required struct field. `Option<&str>` only omits the HTML attribute. Optional attributes shipped in Fusor 0.1.6. Dialog uses them for `aria-labelledby` and `aria-describedby`.
- [fusor-rs/fusor#53](https://github.com/fusor-rs/fusor/issues/53) — the Fusor 0.1.6 install script's Tailwind download does not run on glibc hosts such as GitHub's Ubuntu runners.
- Fusor 0.1.6 wants `assets = { "/" = "public" }` and accepts `tailwind = "web/app.css"`.
- An author `display` rule on `dialog` overrides the user-agent rule `dialog:not([open]) { display: none }`. Dialog sets `display` only on `.tesso-dialog[open]`.
- A literal component attribute is `&str`, not `String`.

## License

[MIT](LICENSE)
