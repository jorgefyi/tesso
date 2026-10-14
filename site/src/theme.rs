//! Theme switch: a `.dark` class on `<html>`, persisted in localStorage.
//! web/index.html adds `.dark` before first paint only when the stored choice is dark.
//! With nothing stored, the page stays light.
//! tokens.css does not read `prefers-color-scheme`; that decision stays in the app.

fn root() -> Option<web_sys::Element> {
    web_sys::window()?.document()?.document_element()
}

/// The theme currently on `<html>`.
pub fn current_theme() -> &'static str {
    match root() {
        Some(el) if el.class_list().contains("dark") => "dark",
        _ => "light",
    }
}

pub fn set_theme(theme: &str) {
    let Some(el) = root() else { return };
    let classes = el.class_list();
    let _ = if theme == "dark" {
        classes.add_1("dark")
    } else {
        classes.remove_1("dark")
    };
    if let Some(storage) = web_sys::window().and_then(|w| w.local_storage().ok().flatten()) {
        let _ = storage.set_item("theme", theme);
    }
}
