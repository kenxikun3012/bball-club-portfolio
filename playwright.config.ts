import { defineConfig, devices } from "@playwright/test";
import { MOCK_PRIVATE_KEY, MOCK_URL_ENDPOINT } from "./scripts/mock-imagekit.mjs";

/**
 * End-to-end tests run against a production build and an ISOLATED database
 * (always a "test" one). Build first: `npm run build && npm run test:e2e`.
 */
const PORT = 3103;
export const MOCK_IMAGEKIT_PORT = 3198;
const dbName = /test/i.test(process.env.MONGODB_DB ?? "") ? process.env.MONGODB_DB! : "bball_club_test";
process.env.MONGODB_DB = dbName;
process.env.IP_HASH_SALT ||= "e2e-test-salt";

export default defineConfig({
  testDir: "./tests/e2e",
  globalSetup: "./tests/e2e/global-setup.ts",
  globalTeardown: "./tests/e2e/global-teardown.ts",
  // One worker: the specs share one database and edit shared content.
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : [["list"]],
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `node node_modules/next/dist/bin/next start -p ${PORT}`,
    url: `http://127.0.0.1:${PORT}/admin/login`,
    reuseExistingServer: false,
    timeout: 60_000,
    env: {
      MONGODB_URI: process.env.MONGODB_URI ?? "",
      MONGODB_DB: dbName,
      IP_HASH_SALT: process.env.IP_HASH_SALT,
      NODE_ENV: "production",
      // Mock ImageKit (started in global setup) so uploads are testable without an account.
      IMAGEKIT_PRIVATE_KEY: MOCK_PRIVATE_KEY,
      IMAGEKIT_URL_ENDPOINT: MOCK_URL_ENDPOINT,
      IMAGEKIT_UPLOAD_URL: `http://127.0.0.1:${MOCK_IMAGEKIT_PORT}/api/v1/files/upload`,
    },
  },
});
