# Changelog

## 0.4.1

Components are fetched from a registry. The docs site is a Fusor app.

### Added

- Each component is one JSON file in `registry/` (`button.json`, `card.json`, `dialog.json`). The file lists the name, dependencies, files and their contents, CSS variables, and the minimum tesso-ui and Fusor versions. `registry/components/` and `registry/registry.json` are gone. That JSON is the only copy shipped in the package.
- `tesso add` and `tesso list` read `https://tesso.fyi/r/` by default. `tesso add button` fetches `https://tesso.fyi/r/button.json`. `--registry` takes a base URL or a local folder, so CI and offline use can read a checkout. `tesso.config.json` may set the same `registry` value. The flag wins. The command prints which registry it used.
- If this CLI is older than the file's `tessoUi`, `add` writes nothing and names the version required. If `Cargo.toml` pins an older `fusor-core` than the file's `fusor`, it refuses the same way.
- If the registry cannot be reached, `add` and `list` fail and name the URL.
- A target file that already exists and differs is skipped. `add` says so and exits 0. `--diff` prints the diff and does not write. `--force` overwrites. `--overwrite` is the same as `--force`.
- `site/` is a Fusor app that uses `tokens.css`, Button, Card, and Dialog. It has a landing page and docs for install, init, check, add, and each component. An `assets-build` hook copies `registry/` to `/r/*.json` and writes an index for `tesso list`.
- `vercel.json` sets `git.deploymentEnabled` to false, so a push does not deploy, including a push to main. GitHub Actions deploys production on `v*` tags and a preview on pull requests with `vercel build` and `vercel deploy --prebuilt`. The job prints a notice and stays green when `VERCEL_TOKEN`, `VERCEL_ORG_ID`, or `VERCEL_PROJECT_ID` is missing.
- The example is checked on Fusor 0.1.7. That job installs CLI 0.1.7 with `install.sh`, because CLI 0.1.9 refuses a 0.1.7 `fusor-build` pin. The site pins Fusor 0.1.9. Deploy installs that CLI with `curl -fsSL https://fusor.build/install.sh | sh -s -- v0.1.9`. CI also builds the site on Fusor main.

### Fixed

- Component CSS declares `@layer properties, theme, base, components, utilities` before its rules. Tailwind's preflight was loading afterward and, because `components` had been created first, it wiped padding, button fills, radii, and sizes.
- Button's base rule uses `font: inherit`, so it takes the page font instead of `system-ui`.
- Button focus no longer uses bare `:focus { outline: none }`. `:focus` draws `2px solid var(--ring)` with `outline-offset: 2px`; `:focus:not(:focus-visible)` clears the ring for pointer focus so keyboard users always keep a visible ring.
- The not-found section is served only for an unknown path (`404.html`). `index.html` does not include it, and the docs routes rewrite to that file.

### Changed

- Button's `variant` and `size` are optional. They default to `primary` and `md` (`#[input(default = ...)]`, Fusor 0.1.7).
- The minimum Fusor version is 0.1.7, in the registry files and in the example. Dialog's hand-written inputs derive `Inputs`, which Fusor 0.1.7 requires. The site pins `fusor-core`, `fusor-components`, and `fusor-build` to 0.1.9.
- The deploy workflow installs the Fusor CLI with `install.sh` pinned to 0.1.9. The 0.1.7 check installs CLI 0.1.7 the same way. Fusor 0.1.7 fixes the Linux musl Tailwind download.
- `tesso init` records the devDependency `tesso-ui` as `^0.4.1`.

## 0.4.0

Tokens are a CSS file the project owns.

### Breaking changes

- `tesso init` writes `public/tokens.css` (the `outFile` path) once. The 19 values are the same raw `oklch()` colors as 0.3.1, on `:root` and `.dark`. `init` does not overwrite that file. `--force` replaces it with the starter.
- `tesso build` is removed. Token JSON, the resolver, `.tesso/`, and `terrazzo.config.ts` are removed.
- `tesso.config.json` keeps `outFile` and `prefix`. `tokens`, `engine`, `themes`, and `themeAttribute` are unknown keys. There is no style-dictionary option.
- `@terrazzo/cli`, `@terrazzo/plugin-css`, and `@terrazzo/token-tools` are not dependencies, and `init` does not install them.
- `init` does not set Fusor `assets-build`. An existing hook that is exactly `npx tesso-ui build` or `npx fusor-tokens build` is removed. `assets = { "/" = "public" }` is still added when `assets` is missing.
- `tesso check` reads the CSS file. Every required token must be set on `:root`, and every color on `.dark`. Colors must be `oklch()` or `var()`. `--radius` must be a length or `var()`. Foreground and background pairs, including `--primary-foreground` on `--destructive`, must meet WCAG AA 4.5:1 in both themes. Failure prints the problem and exits non-zero.
- `tesso init --migrate` only renames matching `--ft-*` names in project source and lists the names it left alone. It does not move folders or rewrite an older config.
- `tesso init` records the devDependency `tesso-ui` as `^0.4.0`.

## 0.3.1

Docs patch. `themeAttribute` is ignored. Light and dark CSS are unchanged.

### Changed

- The README opening describes Tesso as a CLI that copies accessible components and plain CSS design tokens into a Fusor project, so you own and edit the code.
- The README matches what 0.3.0 shipped: no `--tesso-` prefix, 19 plain tokens as raw `oklch()` on `:root` and `.dark`, an `@theme inline` bridge when Fusor sets `tailwind`, component CSS in `@layer components` so a utility overrides a component rule without `!important`, Card and Dialog `footer` slots, Fusor 0.1.6 or newer, and literal spacing, type, and shadows.
- `npx tesso-ui init --migrate` is documented as renaming only `--ft-*` names that have a matching token, and listing the rest.
- Fusor notes match the 0.3.0 release: #20, #21, #22, #26, and #28 are fixed in Fusor 0.1.6. #23, #24, #25, #27, and #29 stay open. [#52](https://github.com/fusor-rs/fusor/issues/52) and [#53](https://github.com/fusor-rs/fusor/issues/53) are included.
- `themeAttribute` is no longer written. A config that still sets it is ignored. Light stays on `:root` and dark on `.dark`.
- `tesso init` records the devDependency `tesso-ui` as `^0.3.1`.
- The button note says there's no `--destructive-foreground`; the danger button uses `--primary-foreground` for its text.
- No starter colors or component code match a published palette. `--radius` stays `0.625rem`, a common value, so no notice file is included.

## 0.3.0

Plain token names and a Tailwind bridge. Nothing has shipped with a `--tesso-` prefix, so there is no migration for that name.

### Breaking changes

- The default prefix is empty. Custom properties are `--background`, `--primary`, and `--radius`, not `--tesso-background`. A custom prefix still prefixes the token file (`--brand-background`). `tesso add` requires an empty prefix because the copied components use the plain names.
- Light values live on `:root`. Dark values live on `.dark`. `tokens.css` no longer emits `@media (prefers-color-scheme: dark)` or a `[data-theme]` selector. The app puts `.dark` on `<html>`.
- The starter is these 19 tokens: `--background`, `--foreground`, `--card`, `--card-foreground`, `--popover`, `--popover-foreground`, `--primary`, `--primary-foreground`, `--secondary`, `--secondary-foreground`, `--muted`, `--muted-foreground`, `--accent`, `--accent-foreground`, `--destructive`, `--border`, `--input`, `--ring`, `--radius`. Values are raw `oklch()` (and `0.625rem` for `--radius`). There is no `--destructive-foreground`, and no `--success`, `--warning`, `--subtle-foreground`, `--border-strong`, `--elevation-*`, `--space-*`, `--family-*`, `--type-size-*`, `--weight-*`, `--line-height-*`, `--gray-*`, or `--palette-*`.
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

First release of the token pipeline that wrote `public/tokens.css` for Fusor, with light and dark themes.
