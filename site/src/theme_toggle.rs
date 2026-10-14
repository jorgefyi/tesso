use crate::theme;
use fusor::prelude::*;

#[derive(FromInputs)]
pub struct ThemeToggle {
    #[local(init = signal(theme::current_theme().to_owned()))]
    theme: Signal<String>,
}

impl ThemeToggle {
    fn toggle(&self) {
        let next = if self.theme.get() == "dark" {
            "light"
        } else {
            "dark"
        };
        theme::set_theme(next);
        self.theme.set(next.to_owned());
    }

    fn label(&self) -> &'static str {
        if self.theme.get() == "dark" {
            "Switch to light theme"
        } else {
            "Switch to dark theme"
        }
    }
}

fusor::template!("web/components/theme_toggle.html");
