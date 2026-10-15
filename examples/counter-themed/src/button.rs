//! Button copied by `tesso add button`.
//!
//! Fusor component tags do not accept `on:click` (that attribute is only for
//! native elements, and the name is not a snake_case input). The page passes
//! an `on_press` callback instead. `variant` and `size` are static strings.
//! Omit them and they default to `primary` and `md`.
//!
//! Variants: primary, secondary, quiet, danger.
//! Sizes: sm, md, lg.

use std::rc::Rc;

use fusor::prelude::*;

#[derive(FromInputs)]
pub struct Button {
    #[input(default = "primary")]
    variant: &'static str,
    #[input(default = "md")]
    size: &'static str,
    #[input]
    on_press: Rc<dyn Fn()>,
}

impl Button {
    fn press(&self) {
        (self.on_press)();
    }
}

fusor::template!("web/components/button.html");
