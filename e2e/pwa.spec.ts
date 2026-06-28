import { test, expect } from "@playwright/test";

/**
 * Installability + offline coverage for the PWA setup.
 * Runs against the production build (webServer = `next build && next start`),
 * which is the only mode where the service worker registers.
 */

test.describe("PWA installability", () => {
  test("serves a valid web app manifest with required install fields", async ({ request }) => {
    const res = await request.get("/manifest.webmanifest");
    expect(res.status()).toBe(200);
    const m = await res.json();
    expect(m.name).toBeTruthy();
    expect(m.short_name).toBe("Remoney");
    expect(m.start_url).toBe("/");
    expect(m.display).toBe("standalone");

    // Needs at least a 192 and a 512 icon to be installable.
    const sizes: string[] = (m.icons ?? []).map((i: { sizes: string }) => i.sizes);
    expect(sizes).toContain("192x192");
    expect(sizes).toContain("512x512");
    // And a maskable icon for a clean adaptive launcher icon.
    const purposes: string[] = (m.icons ?? []).map((i: { purpose?: string }) => i.purpose ?? "");
    expect(purposes.join(" ")).toContain("maskable");
  });

  test("every manifest icon is reachable", async ({ request }) => {
    const m = await (await request.get("/manifest.webmanifest")).json();
    for (const icon of m.icons as { src: string }[]) {
      const res = await request.get(icon.src);
      expect(res.status(), `${icon.src} should be 200`).toBe(200);
      expect(res.headers()["content-type"]).toContain("image/png");
    }
  });

  test("serves a service worker with a fetch handler", async ({ request }) => {
    const res = await request.get("/sw.js");
    expect(res.status()).toBe(200);
    expect(res.headers()["content-type"]).toContain("javascript");
    const body = await res.text();
    expect(body).toContain('addEventListener("fetch"');
  });

  test("document links the manifest, apple-touch-icon and theme-color", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator('link[rel="manifest"]')).toHaveAttribute(
      "href",
      /manifest\.webmanifest/,
    );
    await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveAttribute(
      "href",
      /apple-touch-icon\.png/,
    );
    await expect(page.locator('meta[name="theme-color"]')).toHaveCount(1);
  });

  test("registers a service worker that takes control of the page", async ({ page }) => {
    await page.goto("/");
    await page.waitForFunction(() => !!navigator.serviceWorker?.controller, null, {
      timeout: 15000,
    });
    const controlled = await page.evaluate(() => !!navigator.serviceWorker.controller);
    expect(controlled).toBe(true);
  });

  test("app still loads offline after the first online visit", async ({ page }) => {
    await page.goto("/");
    // Wait for the worker to control the page and assets to be cached.
    await page.waitForFunction(() => !!navigator.serviceWorker?.controller, null, {
      timeout: 15000,
    });
    await page.waitForLoadState("networkidle");
    await expect(page.getByRole("heading", { name: "Remoney" })).toBeVisible();

    // Go offline and reload — the cached shell must still render and hydrate.
    await page.context().setOffline(true);
    await page.reload();
    await expect(page.getByRole("heading", { name: "Remoney" })).toBeVisible();
    await page.context().setOffline(false);
  });
});
