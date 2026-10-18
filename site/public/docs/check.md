# Check

`tesso check` reads `public/tokens.css`. It does not write the file. A failure names the token and the theme and exits non-zero.

- Every required token is set on `:root`, and every color on `.dark`.
- Colors are `oklch()` or a `var()` that resolves to one. `--radius` is a length or a `var()`.
- Foreground and background pairs meet WCAG AA 4.5:1 in both themes, including `--primary-foreground` on `--destructive`.

```
npx tesso-ui check
```
