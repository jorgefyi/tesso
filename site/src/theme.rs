//! Theme switch: a `.dark` class on `<html>`, persisted in localStorage.
//! web/index.html adds `.dark` before first paint only when the stored choice is dark.
//! With nothing stored, the page stays light.
//! tokens.css does not read `prefers-color-scheme`; that decision stays in the app.

use wasm_bindgen::JsCast;

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
    let _ = classes.add_1("theme-switching");
    let _ = if theme == "dark" {
        classes.add_1("dark")
    } else {
        classes.remove_1("dark")
    };
    if let Some(storage) = web_sys::window().and_then(|w| w.local_storage().ok().flatten()) {
        let _ = storage.set_item("theme", theme);
    }
    if let Some(document) = web_sys::window().and_then(|w| w.document()) {
        if let Ok(Some(meta)) = document.query_selector("meta[name=\"theme-color\"]") {
            let _ = meta.set_attribute(
                "content",
                if theme == "dark" { "#000000" } else { "#fafcff" },
            );
        }
    }
    let Some(window) = web_sys::window() else {
        let _ = classes.remove_1("theme-switching");
        return;
    };
    let el = el.clone();
    let callback = wasm_bindgen::closure::Closure::once_into_js(move || {
        let _ = el.class_list().remove_1("theme-switching");
    });
    let _ = window.set_timeout_with_callback_and_timeout_and_arguments_0(
        callback.as_ref().unchecked_ref(),
        0,
    );
}
