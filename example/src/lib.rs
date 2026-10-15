pub mod app;
pub mod islands;

#[cfg(feature = "hydrate")]
#[wasm_bindgen::prelude::wasm_bindgen]
pub fn hydrate() {
    console_error_panic_hook::set_once();
    leptos::mount::hydrate_islands();
    // Tells htmx-islands.js the wasm is ready: from now on it wakes the islands htmx swaps in.
    leptos_islands_htmx::mark_ready();
}
