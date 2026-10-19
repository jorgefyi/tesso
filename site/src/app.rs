use std::rc::Rc;

use fusor::prelude::*;
use wasm_bindgen::JsCast;
use wasm_bindgen::closure::Closure;
use web_sys::Element;

use crate::button::Button;
use crate::card::Card;
use crate::dialog::Dialog;
use crate::theme_toggle::ThemeToggle;

struct App {
    route: String,
    dialog_open: Signal<bool>,
    open_dialog: Rc<dyn Fn()>,
    close_dialog: Rc<dyn Fn()>,
    noop: Rc<dyn Fn()>,
    copied: Signal<bool>,
    copy_cmd: Rc<dyn Fn()>,
    markdown_copied: Signal<bool>,
}

impl App {
    fn new() -> Self {
        let route = current_path();
        set_document_title(title_for(&route));
        install_snippet_copy();
        let dialog_open = signal(false);
        let open_dialog = {
            let dialog_open = dialog_open.clone();
            Rc::new(move || dialog_open.set(true)) as Rc<dyn Fn()>
        };
        let close_dialog = {
            let dialog_open = dialog_open.clone();
            Rc::new(move || dialog_open.set(false)) as Rc<dyn Fn()>
        };
        let noop = Rc::new(|| {}) as Rc<dyn Fn()>;
        let copied = signal(false);
        let copy_cmd = {
            let copied = copied.clone();
            Rc::new(move || {
                let Some(window) = web_sys::window() else {
                    return;
                };
                let _ = window
                    .navigator()
                    .clipboard()
                    .write_text("npx tesso-ui init");
                copied.set(true);
                let copied = copied.clone();
                let callback = Closure::once_into_js(move || copied.set(false));
                let _ = window.set_timeout_with_callback_and_timeout_and_arguments_0(
                    callback.unchecked_ref(),
                    1600,
                );
            }) as Rc<dyn Fn()>
        };
        Self {
            route,
            dialog_open,
            open_dialog,
            close_dialog,
            noop,
            copied,
            copy_cmd,
            markdown_copied: signal(false),
        }
    }

    fn copy_init(&self) {
        (self.copy_cmd)();
    }

    fn hide_copy_icon(&self) -> bool {
        self.copied.get()
    }

    fn hide_check_icon(&self) -> bool {
        !self.copied.get()
    }

    fn copy_status(&self) -> &'static str {
        if self.copied.get() { "Copied" } else { "" }
    }

    fn on_docs(&self) -> bool {
        self.route.starts_with("/docs/")
    }

    fn hide_docs(&self) -> bool {
        !self.on_docs()
    }

    fn current_docs(&self) -> Option<&'static str> {
        if self.on_docs() { Some("page") } else { None }
    }

    fn nav_current(&self, path: &str) -> Option<&'static str> {
        if self.route == path { Some("page") } else { None }
    }

    fn nav_install(&self) -> Option<&'static str> {
        self.nav_current("/docs/install")
    }
    fn nav_init(&self) -> Option<&'static str> {
        self.nav_current("/docs/init")
    }
    fn nav_check(&self) -> Option<&'static str> {
        self.nav_current("/docs/check")
    }
    fn nav_add(&self) -> Option<&'static str> {
        self.nav_current("/docs/add")
    }
    fn nav_button(&self) -> Option<&'static str> {
        self.nav_current("/docs/button")
    }
    fn nav_card(&self) -> Option<&'static str> {
        self.nav_current("/docs/card")
    }
    fn nav_dialog(&self) -> Option<&'static str> {
        self.nav_current("/docs/dialog")
    }

    fn docs_md_href(&self) -> String {
        format!("{}.md", self.route)
    }

    fn docs_markdown(&self) -> &'static str {
        match self.route.as_str() {
            "/docs/install" => include_str!("../public/docs/install.md"),
            "/docs/init" => include_str!("../public/docs/init.md"),
            "/docs/check" => include_str!("../public/docs/check.md"),
            "/docs/add" => include_str!("../public/docs/add.md"),
            "/docs/button" => include_str!("../public/docs/button.md"),
            "/docs/card" => include_str!("../public/docs/card.md"),
            "/docs/dialog" => include_str!("../public/docs/dialog.md"),
            _ => "",
        }
    }

    fn copy_markdown(&self) {
        let Some(window) = web_sys::window() else {
            return;
        };
        let text = self.docs_markdown();
        if text.is_empty() {
            return;
        }
        let _ = window.navigator().clipboard().write_text(text);
        self.markdown_copied.set(true);
        let markdown_copied = self.markdown_copied.clone();
        let callback = Closure::once_into_js(move || markdown_copied.set(false));
        let _ = window.set_timeout_with_callback_and_timeout_and_arguments_0(
            callback.unchecked_ref(),
            1600,
        );
    }

    fn markdown_status(&self) -> &'static str {
        if self.markdown_copied.get() { "Copied" } else { "" }
    }

    fn hide_home(&self) -> bool {
        self.route != "/"
    }
    fn hide_install(&self) -> bool {
        self.route != "/docs/install"
    }
    fn hide_init(&self) -> bool {
        self.route != "/docs/init"
    }
    fn hide_check(&self) -> bool {
        self.route != "/docs/check"
    }
    fn hide_add(&self) -> bool {
        self.route != "/docs/add"
    }
    fn hide_button(&self) -> bool {
        self.route != "/docs/button"
    }
    fn hide_card(&self) -> bool {
        self.route != "/docs/card"
    }
    fn hide_dialog(&self) -> bool {
        self.route != "/docs/dialog"
    }
    fn hide_test(&self) -> bool {
        // Scaffolding route gated out of public surfaces (prep-for-prod H10).
        true
    }

    fn button_snippet(&self) -> &'static str {
        "<Button variant=\"primary\" size=\"md\" on_press=\"{{ state.save.clone() }}\">Save</Button>"
    }
    fn card_snippet(&self) -> &'static str {
        "<Card title=\"Shift\" description=\"A short line under the title.\">\n  <template slot=\"footer\">Footer</template>\n</Card>"
    }
    fn dialog_snippet(&self) -> &'static str {
        "<Dialog\n  open=\"{{ state.dialog_open.clone() }}\"\n  title=\"Reset the counter?\"\n  description=\"This sets the count back to zero.\"\n>\n  <template slot=\"footer\">Actions</template>\n</Dialog>"
    }
    fn add_snippet(&self) -> &'static str {
        "npx tesso-ui add button card dialog\nnpx tesso-ui add button --diff\nnpx tesso-ui add button --force\nnpx tesso-ui add button --registry ../registry"
    }
}

fn install_snippet_copy() {
    let Some(document) = web_sys::window().and_then(|window| window.document()) else {
        return;
    };
    let closure = Closure::<dyn FnMut(web_sys::Event)>::new(move |event: web_sys::Event| {
        let Some(target) = event.target().and_then(|t| t.dyn_into::<Element>().ok()) else {
            return;
        };
        let Ok(Some(btn)) = target.closest("[data-snippet-copy]") else {
            return;
        };
        let Ok(Some(wrap)) = btn.closest(".code-wrap") else {
            return;
        };
        let Ok(Some(pre)) = wrap.query_selector("pre") else {
            return;
        };
        let text = pre.text_content().unwrap_or_default();
        let Some(window) = web_sys::window() else {
            return;
        };
        let _ = window.navigator().clipboard().write_text(&text);
        if let Ok(Some(idle)) = btn.query_selector("[data-copy-idle]") {
            let _ = idle.set_attribute("hidden", "");
        }
        if let Ok(Some(done)) = btn.query_selector("[data-copy-done]") {
            let _ = done.remove_attribute("hidden");
        }
        if let Some(doc) = web_sys::window().and_then(|w| w.document()) {
            if let Ok(Some(live)) = doc.query_selector("#snippet-copy-status") {
                live.set_text_content(Some("Copied"));
            }
        }
        let btn = btn.clone();
        let callback = Closure::once_into_js(move || {
            if let Ok(Some(idle)) = btn.query_selector("[data-copy-idle]") {
                let _ = idle.remove_attribute("hidden");
            }
            if let Ok(Some(done)) = btn.query_selector("[data-copy-done]") {
                let _ = done.set_attribute("hidden", "");
            }
            if let Some(doc) = web_sys::window().and_then(|w| w.document()) {
                if let Ok(Some(live)) = doc.query_selector("#snippet-copy-status") {
                    live.set_text_content(Some(""));
                }
            }
        });
        let _ = window.set_timeout_with_callback_and_timeout_and_arguments_0(
            callback.unchecked_ref(),
            1600,
        );
    });
    let _ = document
        .add_event_listener_with_callback("click", closure.as_ref().unchecked_ref());
    closure.forget();
}

fn current_path() -> String {
    let raw = web_sys::window()
        .and_then(|window| window.location().pathname().ok())
        .unwrap_or_else(|| "/".to_owned());
    let trimmed = raw.trim();
    if trimmed.is_empty() || trimmed == "/index.html" {
        return "/".to_owned();
    }
    let without_slash = trimmed.trim_end_matches('/');
    if without_slash.is_empty() {
        "/".to_owned()
    } else {
        without_slash.to_owned()
    }
}

fn title_for(route: &str) -> &'static str {
    match route {
        "/" => "Tesso",
        "/docs/install" => "Install — Tesso",
        "/docs/init" => "Init — Tesso",
        "/docs/check" => "Check — Tesso",
        "/docs/add" => "Add — Tesso",
        "/docs/button" => "Button — Tesso",
        "/docs/card" => "Card — Tesso",
        "/docs/dialog" => "Dialog — Tesso",
        "/test" => "Test — Tesso",
        _ => "Not found — Tesso",
    }
}

fn set_document_title(title: &str) {
    if let Some(document) = web_sys::window().and_then(|window| window.document()) {
        document.set_title(title);
    }
}

fusor::template!("web/index.html");
