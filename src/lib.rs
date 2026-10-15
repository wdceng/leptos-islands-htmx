//! Leptos islands in pages that htmx swaps.
//!
//! - [`collected`] frees an island once it has left the page.
//! - [`mark_ready`] tells the glue the wasm is ready, so it wakes the islands htmx swaps in.
//! - [`SCRIPT`] is the glue, for the server to serve at `/htmx-islands.js`.
//!
//! The README has the steps to use it in an app.

#![cfg_attr(docsrs, feature(doc_cfg))]

mod collect;

pub use collect::collected;

/// Tells `htmx-islands.js` the wasm is ready: from now on it wakes the islands htmx swaps in.
///
/// Call it in the app's `hydrate()`, right after `leptos::mount::hydrate_islands()`.
#[cfg(feature = "hydrate")]
#[cfg_attr(docsrs, doc(cfg(feature = "hydrate")))]
pub fn mark_ready() {
    use leptos::prelude::*;

    let _ = leptos::web_sys::js_sys::Reflect::set(
        &window(),
        &"__islandsReady".into(),
        &true.into(),
    );
}

/// The glue: wakes the islands added to the page, and keeps htmx from dropping the comments Leptos hydrates by.
///
/// Serve it at `/htmx-islands.js`, and load it in the page's `<head>` next to htmx.
pub const SCRIPT: &str = include_str!("htmx-islands.js");
