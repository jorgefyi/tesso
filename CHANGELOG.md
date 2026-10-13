# Changelog

## 0.3.1

Docs patch. `themeAttribute` is ignored. Light and dark CSS are unchanged.

### Changed

- The README opening describes Tesso as a CLI that copies accessible components and plain CSS design tokens into a Fusor project, so you own and edit the code.
- The README matches what 0.3.0 shipped: no `--tesso-` prefix, 19 plain tokens as raw `oklch()` on `:root` and `.dark`, an `@theme inline` bridge when Fusor sets `tailwind`, component CSS in `@layer components` so a utility overrides a component rule without `!important`, Card and Dialog `footer` slots, Fusor 0.1.6 or newer, and literal spacing, type, and shadows.
- `npx tesso-ui init --migrate` is documented as renaming only `--ft-*` names that have a matching token, and listing the rest.
- Fusor notes match the 0.3.0 release: #20, #21, #22, #26, and #28 are fixed in Fusor 0.1.6. #23, #24, #25, #27, and #29 stay open. [#52](https://github.com/fusor-rs/fusor/issues/52) and [#53](https://github.com/fusor-rs/fusor/issues/53) are included.
- `themeAttribute` is no longer written. A config that still sets it is ignored. Light stays on `:root` and dark on `.dark`.
- `tesso init` records the devDependency `tesso-ui` as `^0.3.1`.

## 0.3.0

Plain token names and a Tailwind bridge. Nothing has shipped with a `--tesso-` prefix, so there is no migration for that name.

### Breaking changes

- The default prefix is empty. Custom properties are `--background`, `--primary`, and `--radius`, not `--tesso-background`. A custom prefix still prefixes the token file (`--brand-background`). `tesso add` requires an empty prefix because the copied components use the plain names.
- Light values live on `:root`. Dark values live on `.dark`. `tokens.css` no longer emits `@media (prefers-color-scheme: dark)` or a `[data-theme]` selector. The app puts `.dark` on `<html>`.
- The starter is the shadcn set only: `--background`, `--foreground`, `--card`, `--card-foreground`, `--popover`, `--popover-foreground`, `--primary`, `--primary-foreground`, `--secondary`, `--secondary-foreground`, `--muted`, `--muted-foreground`, `--accent`, `--accent-foreground`, `--destructive`, `--border`, `--input`, `--ring`, `--radius`. Values are raw `oklch()` (and `0.625rem` for `--radius`). There is no `--destructive-foreground`, and no `--success`, `--warning`, `--subtle-foreground`, `--border-strong`, `--elevation-*`, `--space-*`, `--family-*`, `--type-size-*`, `--weight-*`, `--line-height-*`, `--gray-*`, or `--palette-*`.
- `tesso init --migrate` still moves `.fusor-tokens/` and, when the old prefix was `ft` or there was no config, rewrites `--ft-*` names that have a kept token (`--ft-color-bg` → `--background`, `--ft-color-accent` → `--primary`), not to `--tesso-*`. Names with no kept token stay as they are, and `init` lists them. A custom prefix is kept and `--ft-` is not rewritten. Token JSON is not rewritten. A full fusor-tokens JSON file still contains ids that are not in this set; those ids are not given new names, and a name that would collide with a Tailwind theme namespace fails `check` and `build`.
- New apps get `assets = { "/" = "public" }`, which Fusor 0.1.6 requires. An existing `assets = "public"` string is left alone.
- Card and Dialog take a `footer` named child. Dialog sets `aria-labelledby` and `aria-describedby` only when the title or description is non-empty. Named children and optional attributes require Fusor 0.1.6 or newer. Button, Card, and Dialog all build on that release.
- Component CSS is wrapped in `@layer components`. Spacing, type, and shadows in those rules are literals. The danger button uses `--primary-foreground` for its text because there is no `--destructive-foreground`.
- Tesso requires Fusor 0.1.6 or newer.

### Added

- `tesso init` reads `tailwind = "web/app.css"` from `[package.metadata.fusor]` and writes `@theme inline` mappings (`--color-primary: var(--primary)` for each kept color, and `--radius-sm` / `--radius-md` / `--radius-lg` / `--radius-xl` from `--radius`). `bg-primary` follows `.dark`. The token file itself never sets Tailwind's `--color-*`, `--radius-*`, `--font-*`, `--shadow-*`, or `--spacing` namespaces.
- A token name that would collide with a Tailwind theme namespace fails `check` and `build`.

## 0.2.0

Tesso copies accessible Fusor components and keeps the 0.1 token pipeline. The npm package is `tesso-ui`. The binary is `tesso`.

### Breaking changes

- The package name is `tesso-ui` instead of `fusor-tokens`. The `fusor-tokens` binary is gone. The only binary is `tesso`, so `npx tesso-ui` and `tesso` both run it.
- `fusor-tokens.config.json` is now `tesso.config.json`. `$schema` points at `tesso-ui`.
- The pipeline directory `.fusor-tokens/` is now `.tesso/`.
- The default CSS prefix is `tesso` (`--tesso-`) instead of `ft` (`--ft-`). `tesso init --migrate` rewrites `--ft-` in `.css`, `.html`, `.rs`, `.js`, `.mjs`, and `.md` when the old prefix was `ft` or there was no config. A custom prefix is kept and those references are not rewritten. Token JSON is not rewritten.
- `tesso build` and `tesso check` do not migrate. If `.fusor-tokens/` or `fusor-tokens.config.json` is still present they error and tell you to run `tesso init --migrate`.
- The Fusor `assets-build` argv is `["npx", "tesso-ui", "build"]`.
- The npm devDependency name written by `init` is `tesso-ui`.
- Generated CSS is marked `Generated by tesso.`

### Added

- `tesso add <component...>` copies Button, Card, and Dialog into the app. `--overwrite` replaces existing files. Without it, an existing file is refused and that component is not written.
- `tesso list` prints the built-in registry.
- Dialog uses a native `<dialog>` and `showModal()`. When one dialog opens another, Escape closes only the top dialog. The page behind is inert, the dialog renders in the top layer, and focus returns to the opener even when that control never took focus. It sets `role="dialog"`, `aria-modal`, `aria-labelledby`, and `aria-describedby`.
- `tesso.config.json` may set `registry` to an http(s) URL. Fetching that URL is not implemented yet; the error names the built-in document, which has the same shape.

## 0.1.1

Documentation refresh. No token or CLI behavior change.

## 0.1.0

First release of the DTCG to `public/tokens.css` pipeline for Fusor, with light and dark themes.
