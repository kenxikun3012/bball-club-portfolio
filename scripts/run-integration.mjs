/**
 * Runs every integration suite against a production build and an ISOLATED database.
 *
 *   npm run build
 *   npm run test:integration
 *
 * Needs MONGODB_URI (and optionally IP_HASH_SALT) in the environment; locally these
 * come from .env.local. The database is always a "test" one so real data is never touched.
 */
import { execFileSync, spawn } from "node:child_process";
import { createRequire } from "node:module";
import { MOCK_PRIVATE_KEY, MOCK_URL_ENDPOINT, startMockImageKit } from "./mock-imagekit.mjs";

const PORT = process.env.INTEGRATION_PORT ?? "3102";
const BASE = `http://127.0.0.1:${PORT}`;

if (!process.env.MONGODB_URI) {
  console.error("MONGODB_URI is not set (add it to .env.local or the environment).");
  process.exit(2);
}
const dbName = /test/i.test(process.env.MONGODB_DB ?? "") ? process.env.MONGODB_DB : "bball_club_test";
const MOCK_PORT = Number(process.env.INTEGRATION_MOCK_PORT ?? "3199");
const env = {
  ...process.env,
  // Mock ImageKit so the upload suite needs no real account.
  IMAGEKIT_PRIVATE_KEY: MOCK_PRIVATE_KEY,
  IMAGEKIT_URL_ENDPOINT: MOCK_URL_ENDPOINT,
  IMAGEKIT_UPLOAD_URL: `http://127.0.0.1:${MOCK_PORT}/api/v1/files/upload`,
  MONGODB_DB: dbName,
  IP_HASH_SALT: process.env.IP_HASH_SALT || "integration-test-salt",
  TEST_BASE: BASE,
  NODE_ENV: "production",
};

const SUITES = [
  "test-admin",
  "test-admin-crud",
  "test-admin-applications",
  "test-admin-users",
  "test-admin-audit",
  "test-admin-security",
  "test-admin-uploads",
];

const require = createRequire(import.meta.url);
const nextBin = require.resolve("next/dist/bin/next");

// Seed the isolated database with the club content the suites expect (test DB only).
execFileSync(process.execPath, ["scripts/seed-content.mjs"], { env, stdio: "ignore" });

const mock = await startMockImageKit(MOCK_PORT);
const server = spawn(process.execPath, [nextBin, "start", "-p", PORT], { env, stdio: "ignore" });
let stopped = false;
function stop() {
  if (!stopped) {
    stopped = true;
    server.kill();
    mock.close();
  }
}
process.on("exit", stop);
process.on("SIGINT", () => process.exit(130));

async function waitForServer() {
  for (let i = 0; i < 60; i += 1) {
    try {
      const response = await fetch(`${BASE}/admin/login`);
      if (response.ok) return;
    } catch {
      /* not up yet */
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  throw new Error(`Server did not become ready on ${BASE} (did you run "npm run build"?)`);
}

function runSuite(name) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [`scripts/${name}.mjs`], { env, stdio: ["ignore", "pipe", "pipe"] });
    let output = "";
    child.stdout.on("data", (chunk) => (output += chunk));
    child.stderr.on("data", (chunk) => (output += chunk));
    child.on("close", (code) => {
      const lines = output.split(/\r?\n/);
      const summary = lines.filter((line) => /checks passed/.test(line)).pop() ?? "no summary";
      console.log(`${code === 0 ? "OK  " : "FAIL"} ${name} — ${summary.trim()}`);
      if (code !== 0) console.log(lines.filter((line) => !line.startsWith("PASS")).join("\n"));
      resolve(code === 0);
    });
  });
}

let failed = 0;
try {
  await waitForServer();
  console.log(`Integration suites against ${BASE} (database "${dbName}")`);
  for (const name of SUITES) {
    if (!(await runSuite(name))) failed += 1;
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  failed += 1;
} finally {
  stop();
}
process.exit(failed > 0 ? 1 : 0);
