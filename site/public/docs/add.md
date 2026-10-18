# Add

`tesso add` reads one JSON file per component from a single base URL. The default is `https://tesso.fyi/r/`, so button is `/r/button.json`. The command prints the registry it used.

`--registry` takes that base URL or a local folder. CI, tests, and offline use pass a checkout, for example `--registry ../registry`. `tesso.config.json` can set the same `registry` value. The flag wins.

```
npx tesso-ui add button card dialog
npx tesso-ui add button --diff
npx tesso-ui add button --force
npx tesso-ui add button --registry ../registry
```

- A missing file is written. An identical file is kept.
- A file that already exists and differs is skipped. add says so and exits 0.
- `--diff` prints the diff and does not write. `--force` overwrites. `--overwrite` is the same flag.
- If this CLI is older than the file’s minimum tesso-ui version, add writes nothing and names the version it needs.
- If the registry cannot be reached, add fails and names the URL.

`tesso list` prints the same registry. Components require an empty prefix, because they read variables such as `--primary`.
