import { execFileSync } from "node:child_process";
import { cleanup, withDb } from "./helpers";

export default async function globalTeardown() {
  await withDb(cleanup);
  // Restore seeded content that the editing spec changed (test database only).
  execFileSync(process.execPath, ["scripts/seed-content.mjs"], { env: process.env, stdio: "ignore" });
}
