# leptos-islands-htmx-example e2e tests

Playwright tests for the leptos-islands-htmx-example: a link swaps the page
without a load, a swapped-in island wakes, a swapped-out island is freed, and
Back loads the page.

## Running

Serve the example (from `example/`):

```sh
cargo leptos serve
```

Then, in this directory:

```sh
npm install
npx playwright install chromium
npx playwright test
```

**For htmx 4, set `HTMX=4` on both** `cargo leptos serve` and `npx playwright test`.
