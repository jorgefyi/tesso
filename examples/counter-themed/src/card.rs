//! Card copied by `tesso add card`.
//!
//! `title` and `description` are static strings (`title="Shift"`). An empty
//! string hides that line. The body is the default `<Children>` slot. A
//! `<template slot="footer">` fills `<Children name="footer">`. Named slots
//! need Fusor 0.1.7 or newer.

use fusor::prelude::*;

#[derive(FromInputs)]
pub struct Card {
    #[input]
    title: &'static str,
    #[input]
    description: &'static str,
}

fusor::template!("web/components/card.html");
