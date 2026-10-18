# Init

`tesso init` writes `tesso.config.json` and `public/tokens.css` once, with the 19 starter tokens. If that CSS file already exists, init leaves it alone. `--force` replaces it.

It records an npm devDependency on tesso-ui, and when `assets` is missing it sets `assets = { "/" = "public" }`. When Fusor sets `tailwind`, init writes an `@theme inline` bridge so utilities such as `bg-primary` follow `.dark`.

`tesso init --migrate` only renames `--ft-*` variables that have a matching token, and lists the names it left alone.

```
<link rel="stylesheet" href="/tokens.css" />
<link rel="stylesheet" href="/tesso.css" />
```

Put `.dark` on `<html>` in the app. tokens.css does not read `prefers-color-scheme`.
