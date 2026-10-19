# Button

`variant` is `primary` (the default), `secondary`, `quiet`, or `danger`. `size` is `sm`, `md` (the default), or `lg`. Omit either one and the default is used. `on_press` is the callback. Focus draws a ring from `--ring`.

There’s no `--destructive-foreground`. The danger button uses `--primary-foreground` for its text.

```
<Button variant="primary" size="md" on_press="{{ state.save.clone() }}">Save</Button>
```
