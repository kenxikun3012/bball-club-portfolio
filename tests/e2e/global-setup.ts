import { execFileSync } from "node:child_process";
import { startMockImageKit } from "../../scripts/mock-imagekit.mjs";
import { seed, withDb } from "./helpers";

const MOCK_IMAGEKIT_PORT = 3198; // keep in sync with playwright.config.ts

export default async function globalSetup() {
  // Club content for the public site, then ephemeral admin users + one application.
  execFileSync(process.execPath, ["scripts/seed-content.mjs"], { env: process.env, stdio: "ignore" });
  await withDb(seed);

  const mock = await startMockImageKit(MOCK_IMAGEKIT_PORT);
  // Playwright calls the returned function at the end of the run.
  return async () => {
    await new Promise<void>((resolve) => mock.close(() => resolve()));
  };
}
