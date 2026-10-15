import { test, expect, Page } from "@playwright/test";

// `HTMX=4` runs the server and these tests with htmx 4; without it, htmx 2.
const HTMX_4 = process.env.HTMX === "4";

function collectErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") {
      errors.push(msg.text());
    }
  });
  page.on("pageerror", (err) => {
    errors.push(String(err));
  });
  return errors;
}

// A mark on the window: it survives a swap and is lost on a page load.
async function mark(page: Page) {
  await page.evaluate(() => {
    (window as any).sameDocument = true;
  });
}

function marked(page: Page) {
  return page.evaluate(() => (window as any).sameDocument === true);
}

test("a link swaps the page without a load, and a swapped-in island wakes", async ({ page }) => {
  const errors = collectErrors(page);

  await page.goto("/");
  await expect(page).toHaveTitle("Home");
  await mark(page);

  await page.click('nav a[href="/about"]');
  await expect(page).toHaveURL(/\/about$/);
  await expect(page).toHaveTitle("About");
  await expect(page.getByRole("heading", { name: "About" })).toBeVisible();
  expect(await marked(page)).toBe(true);

  await page.click("button[hx-get='/fragment']");
  const counter = page.locator("#slot leptos-island button");
  await expect(counter).toHaveText("Clicks: 0");
  await counter.click();
  await expect(counter).toHaveText("Clicks: 1");

  expect(errors).toEqual([]);
});

test("an island swapped out is freed, and its window listener with it", async ({ page }) => {
  const errors = collectErrors(page);
  const logs: string[] = [];
  page.on("console", (msg) => logs.push(msg.text()));

  await page.goto("/");
  // The component name carries a hash, so match its start.
  const keyLog = page.locator("leptos-island[data-component^='KeyLog'] p");
  await expect(keyLog).toHaveText("Last key: ");
  await page.keyboard.press("a");
  await expect(keyLog).toHaveText("Last key: a");

  await page.click('nav a[href="/about"]');
  await expect(page).toHaveURL(/\/about$/);
  await expect(keyLog).not.toBeAttached();

  // The sweep runs every 2 s in a debug build and frees at the second strike.
  await expect.poll(() => logs.find((line) => line.includes("1 freed")), { timeout: 10_000 }).toBe(
    "islands: 0 live, 1 freed",
  );
  await page.keyboard.press("b");

  expect(errors).toEqual([]);
});

test("Back loads the page again", async ({ page }) => {
  test.skip(HTMX_4, "htmx 4 swaps the page in on Back instead");
  const errors = collectErrors(page);

  await page.goto("/");
  await page.click('nav a[href="/about"]');
  await expect(page).toHaveURL(/\/about$/);
  await mark(page);

  await Promise.all([page.waitForEvent("load"), page.goBack()]);
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("heading", { name: "Home" })).toBeVisible();
  expect(await marked(page)).toBe(false);

  expect(errors).toEqual([]);
});

test("Back swaps the page in again, and its island wakes", async ({ page }) => {
  test.skip(!HTMX_4, "htmx 2 loads the page on Back instead");
  const errors = collectErrors(page);

  await page.goto("/");
  await page.click('nav a[href="/about"]');
  await expect(page).toHaveURL(/\/about$/);
  await mark(page);

  await page.goBack();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("heading", { name: "Home" })).toBeVisible();
  expect(await marked(page)).toBe(true);

  const keyLog = page.locator("leptos-island[data-component^='KeyLog'] p");
  await page.keyboard.press("c");
  await expect(keyLog).toHaveText("Last key: c");

  expect(errors).toEqual([]);
});
