# Dialog demo

Dialog demo lets a visitor open the native modal example on the Dialog docs page (or `/test`), read its content, and dismiss it with Close, Escape, or the dialog close control.

## Sub-features

- `dialog-open` opens the modal from `Open dialog`.
- `dialog-content` shows title `Dialog` and the inert-background description.
- `dialog-close-button` closes via the footer `Close` button.
- `dialog-escape` closes via Escape and returns focus toward the opener.

## How to get to it (user POV)

- Open `/docs/dialog` and choose `Open dialog`.
- Open `/test` and choose `Open dialog`.

## Driving it with control-tesso-site

Preconditions:

- Site is healthy at the launched URL.
- Browser context is open on `/docs/dialog`.
- No dialog is already open.

- **Open.** Choose Open dialog. Run `control-tesso-site browser click --role button --name "Open dialog"`. A dialog named `Dialog` appears (`role=dialog`).
- **Content.** Confirm copy. Run `control-tesso-site browser wait --role dialog --name "Dialog"` and `control-tesso-site browser text --text "The rest of the page is inert while this is open."`.
- **Close via button.** Choose Close. Run `control-tesso-site browser click --role button --name "Close"`. The dialog is hidden.
- **Reopen and Escape.** Open again, then press Escape. Run `control-tesso-site browser click --role button --name "Open dialog"` and `control-tesso-site browser press --key Escape`. The dialog is hidden again.
- **Proof.** Capture the open state before closing. Run `control-tesso-site browser screenshot --path /cursor/stores/bc-e139e1a6-3f39-591d-a24b-dec202a1d280/media/verify-tesso-site/dialog-demo/open.png` and `control-tesso-site browser snapshot --aria --path /cursor/stores/bc-e139e1a6-3f39-591d-a24b-dec202a1d280/media/verify-tesso-site/dialog-demo/open.aria.txt` while the dialog is open. Artifacts must show the dialog title and the Open dialog control context.

## Gotchas

- The site shell also mounts a single shared Dialog component; prove from `/docs/dialog` or `/test` where the Open dialog button lives.
- Closing via the quiet `Close` control in the dialog chrome (aria-label `Close`) is different from the footer `Close` button — either is valid dismissal; record which you used.
- Do not set `open` through eval; the user path is the Open dialog button.
