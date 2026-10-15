# leptos-islands-htmx

Leptos islands in an app that swaps pages and fragments with htmx.

## The problem

Leptos wakes the islands on a page once, when the page loads. htmx swaps new
HTML in without a page load, so two things go wrong:

1. An island htmx **swaps in** stays dead. Leptos never sees it, so its
   buttons do nothing.
2. An island htmx **swaps out** is never freed. The `#[island]` macro keeps
   every island it wakes in memory for good (`std::mem::forget`, with a
   `TODO better cleanup` next to it). Each swap leaves the old island's
   signals, effects and listeners behind until the next page load. Leptos's
   own islands router swaps nodes the same way.

This crate fixes both from the outside, without changing Leptos.

## How this was made

Built with Claude (Anthropic's AI assistant), from code first written for
another app. Reviewed and tested by hand.

## Use it in your app

```rust
use leptos_islands_htmx::{collected, mark_ready, SCRIPT};
```

1. **Add the crate**, with its features next to Leptos's:

   ```toml
   [dependencies]
   leptos = { version = "0.8.22", features = ["islands"] }
   leptos-islands-htmx = "0.1"

   [features]
   hydrate = ["leptos/hydrate", "leptos-islands-htmx/hydrate"]
   ssr = ["leptos/ssr", "leptos-islands-htmx/ssr"]
   ```

   **Without `leptos-islands-htmx/hydrate`, no island is freed.** The
   collector keeps islands only in the browser build.

2. **Wrap each island's body in `collected`**, and call `mark_ready` after
   Leptos has woken the first page's islands:

   ```rust
   #[island]
   pub fn Counter() -> impl IntoView {
       collected(|| {
           let count = RwSignal::new(0);
           view! { <button on:click=move |_| *count.write() += 1>{count}</button> }
       })
   }

   #[cfg(feature = "hydrate")]
   #[wasm_bindgen::prelude::wasm_bindgen]
   pub fn hydrate() {
       leptos::mount::hydrate_islands();
       leptos_islands_htmx::mark_ready();
   }
   ```

3. **Serve the glue at `/htmx-islands.js`**, and load it next to htmx, as in
   [`example/src/app.rs`](example/src/app.rs):

   ```rust
   // Axum; any server works, SCRIPT is a string
   .route("/htmx-islands.js", get(|| async {
       ([(header::CONTENT_TYPE, "text/javascript")], leptos_islands_htmx::SCRIPT)
   }))
   ```

   ```rust
   <script src="/htmx-islands.js" defer></script>
   ```

4. **Set htmx so it never restores islands from its own page snapshots.** A
   restored snapshot holds dead islands.

   - htmx 2: no snapshots, so Back loads the page:

     ```html
     <meta name="htmx-config" content='{"historyCacheSize":0,"refreshOnHistoryMiss":true}'>
     ```

   - htmx 4: `"history": true`, its default. Back refetches the page and swaps
     its `<body>` in, and the glue wakes the islands in it. With morph swaps,
     add `"morphSkip": "leptos-island"`, so a morph leaves islands alone:

     ```html
     <meta name="htmx-config" content='{"history":true,"morphSkip":"leptos-island"}'>
     ```

## Works with

- Leptos 0.8 islands, tested with 0.8.22.
- htmx 2.0.11 and 4.0.0.
- Islands added by anything, not only htmx: the glue watches the page for new
  `<leptos-island>` elements.
- Any server: `SCRIPT` is a string to serve.

## Limits

- **It relies on `window.__hydrateIsland`, which Leptos does not document.**
  Check it is still there after each Leptos upgrade
  (`leptos/src/hydration/island_script.js`).

## Where things are

| File | What it does |
|---|---|
| `src/htmx-islands.js` | The glue. Wakes every island htmx swaps in, and keeps htmx from dropping the HTML comments Leptos needs to wake them |
| `src/collect.rs` | The collector. Frees an island a few seconds after it has left the page |
| `src/collect.rs`, at the end | The collector's tests, in headless Chrome |
| `src/lib.rs` | `collected`, `mark_ready` and `SCRIPT` |
| `example/src/islands.rs` | Two islands: `Counter` with state, `KeyLog` with a window listener it removes when freed |
| `example/src/app.rs` | The pages, `PageLink`, the htmx link that swaps `<main>`, and htmx 2.0.11 or, with `HTMX=4`, 4.0.0 |
| `example/src/main.rs` | The Axum server, `/fragment`, a piece of HTML that holds an island, and `/htmx-islands.js` |
| `example/e2e/tests/htmx.spec.ts` | The end-to-end tests, with Playwright |

## Run the example

```sh
# From the repo root
cd example && cargo leptos watch          # then http://127.0.0.1:3000
cd example && HTMX=4 cargo leptos watch   # the same, with htmx 4
```

1. On Home, press a key: the island shows it.
2. Go to About: `<main>` is swapped, the page does not reload.
3. Click "Load a counter", then click the counter: it counts.
4. In a debug build the console shows `islands: 0 live, 1 freed` a few
   seconds after Home's island has left the page.

## Testing

```sh
# From the repo root

# The collector's tests, in headless Chrome
wasm-pack test --headless --chrome -- --lib --features hydrate

# The end-to-end tests: builds, serves and runs Playwright
# Stop `cargo leptos watch` first: both use port 3000
cd example && cargo leptos end-to-end          # htmx 2
cd example && HTMX=4 cargo leptos end-to-end   # htmx 4
```

The collector's tests check that an island off the page is freed after two
sweeps, kept while on the page, kept when it comes back, and still freed in a
debug build, which erases component types.

The end-to-end tests check that a link swaps the page without a reload, that
the fragment's island counts, that a swapped-out island is freed with its
window listener, and what Back does: htmx 2 loads the page, htmx 4 swaps it
in and the glue wakes its island.

## License

MIT
