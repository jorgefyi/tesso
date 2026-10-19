# Dialog

Dialog renders a native `<dialog>` and calls `showModal()` while `open` is true. Escape, the backdrop, and the close control set `open` back to false. The page behind is inert, and focus returns to the control that opened it.

`title` and `description` are static strings. An empty one hides that line and omits `aria-labelledby` or `aria-describedby`. Adding dialog also adds button, which it depends on.

```
<Dialog
  open="{{ state.dialog_open.clone() }}"
  title="Reset the counter?"
  description="This sets the count back to zero."
>
  <template slot="footer">Actions</template>
</Dialog>
```
