# Copy install command

Copy install command puts `npx tesso-ui init` on the clipboard from the landing hero and briefly announces `Copied`.

## Sub-features

- `copy-click` copies the exact install command from the quiet button beside the code sample.
- `copy-announce` exposes a polite live region that reads `Copied` after a successful copy.
- `copy-clipboard` leaves `npx tesso-ui init` in the system clipboard for paste.

## How to get to it (user POV)

- On `/`, choose the button labeled `Copy install command` next to `npx tesso-ui init`.

## Driving it with control-tesso-site

Preconditions:

- Site is healthy at the launched URL.
- Browser context is open on `/` (`control-tesso-site browser open` then `goto /`).
- Clipboard permission is available (harness grants it on `browser open`).

- **Locate control.** Confirm the button. Run `control-tesso-site browser wait --role button --name "Copy install command"`.
- **Copy.** Choose the button. Run `control-tesso-site browser click --role button --name "Copy install command"`.
- **Live region.** Read the announcement. Run `control-tesso-site browser text --text "Copied"` (or `browser eval --expr "document.querySelector('[aria-live]').textContent"`). Value includes `Copied` within ~1s.
- **Clipboard.** Read the clipboard. Run `control-tesso-site browser clipboard`. Value is exactly `npx tesso-ui init`.
- **Proof.** Capture the post-copy hero (check icon visible briefly). Run `control-tesso-site browser screenshot --path /cursor/stores/bc-e139e1a6-3f39-591d-a24b-dec202a1d280/media/verify-tesso-site/copy-install-command/copied.png` immediately after click, and write `notes.json` with the clipboard value. The live region clears after about 1.6s — do not wait past that before asserting `Copied`.

## Gotchas

- Assert clipboard contents, not only the check icon. Icon state alone is not proof the clipboard was written.
- Headless environments without clipboard permission fail the side-effect check; use this harness's `browser open` (permissions already set).
- The copied string must be `npx tesso-ui init` with no trailing newline.
