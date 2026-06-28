import { defineConfig, devices } from "@playwright/test";

/**
 * E2E config. Boots the Next dev server and drives a mobile-sized Chromium.
 * Remoney is fully client-side, so all assertions are about UI + localStorage.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  timeout: 30_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
    ...devices["Pixel 7"],
  },
  // Test the real production build — no dev-tools overlay intercepting clicks,
  // and it validates the actual artifact that ships to Vercel.
  webServer: {
    command: "npm run build && npm run start",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
