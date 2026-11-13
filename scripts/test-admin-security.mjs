/**
 * Tests for Phase 4a: security headers, robots rules and admin rate limits.
 * Run against a PRODUCTION build and an ISOLATED database:
 *
 *   npm run build
 *   MONGODB_DB=bball_club_test npm start -- -p 3102
 *   MONGODB_DB=bball_club_test TEST_BASE=http://127.0.0.1:3102 \
 *     node --env-file=.env.local scripts/test-admin-security.mjs
 */
import crypto from "node:crypto";
import { MongoClient, ObjectId } from "mongodb";

const BASE = process.env.TEST_BASE ?? "http://127.0.0.1:3102";
const dbName = process.env.MONGODB_DB ?? "bball_club";
if (!/test/i.test(dbName)) {
  console.error(`Refusing to run against "${dbName}": use a database name containing "test".`);
  process.exit(2);
}

const stamp = Date.now();
const results = [];
function check(name, pass, detail = "") {
  results.push({ name, pass });
  console.log(`${pass ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(password, salt, 64, { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 });
  return `scrypt$32768$8$1$${salt.toString("base64url")}$${hash.toString("base64url")}`;
}

const PW = "Test-password-123!";
const emails = { editor: `edi.tor${stamp}@example.com`, owner: `own.er${stamp}@example.com` };

const client = new MongoClient(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 8000 });
await client.connect();
const db = client.db(dbName);

async function login(email) {
  const response = await fetch(`${BASE}/api/admin/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password: PW }),
  });
  const match = (response.headers.get("set-cookie") ?? "").match(/admin_session=([^;]+)/);
  return match ? `admin_session=${match[1]}` : "";
}

const nonceOf = (csp) => csp?.match(/'nonce-([^']+)'/)?.[1];

try {
  const now = new Date();
  const ids = {};
  for (const [role, email] of [["editor", emails.editor], ["owner", emails.owner]]) {
    const inserted = await db.collection("admin_users").insertOne({
      email,
      role,
      passwordHash: hashPassword(PW),
      disabled: false,
      createdAt: now,
      updatedAt: now,
    });
    ids[role] = inserted.insertedId;
  }

  // --- Headers --------------------------------------------------------------
  const first = await fetch(`${BASE}/`);
  const second = await fetch(`${BASE}/`);
  const html = await first.text();
  const csp = first.headers.get("content-security-policy") ?? "";
  check("public page sends a CSP with a nonce", Boolean(nonceOf(csp)), csp.slice(0, 60));
  check("nonce changes on every request", nonceOf(csp) !== nonceOf(second.headers.get("content-security-policy") ?? ""));
  check("CSP blocks framing, plugins and foreign bases", csp.includes("frame-ancestors 'none'") && csp.includes("object-src 'none'") && csp.includes("base-uri 'self'") && csp.includes("form-action 'self'"));
  check("CSP does not allow unsafe-inline or eval for scripts", !/script-src[^;]*'unsafe-(inline|eval)'/.test(csp));
  check("page scripts carry the nonce", html.includes(`nonce="${nonceOf(csp)}"`));
  const bareInline = [...html.matchAll(/<script([^>]*)>/g)].filter(
    (m) => !/src=/.test(m[1]) && !/nonce=/.test(m[1]),
  );
  check("no inline script is missing its nonce (CSP would block it)", bareInline.length === 0, `${bareInline.length} found`);
  check("HSTS is sent on production builds", (first.headers.get("strict-transport-security") ?? "").includes("max-age="));
  check("HSTS does not include subdomains or preload", !/includeSubDomains|preload/i.test(first.headers.get("strict-transport-security") ?? ""));
  check("COOP and existing headers are present", first.headers.get("cross-origin-opener-policy") === "same-origin" && first.headers.get("x-frame-options") === "DENY" && first.headers.get("x-content-type-options") === "nosniff");
  check("public page is indexable (no X-Robots-Tag)", !first.headers.get("x-robots-tag"));

  const loginPage = await fetch(`${BASE}/admin/login`);
  check("admin login page has CSP and noindex", Boolean(nonceOf(loginPage.headers.get("content-security-policy") ?? "")) && (loginPage.headers.get("x-robots-tag") ?? "").includes("noindex"));
  const gated = await fetch(`${BASE}/api/admin/users`);
  check("gated admin API still 401s and is noindex", gated.status === 401 && (gated.headers.get("x-robots-tag") ?? "").includes("noindex"), `status ${gated.status}`);
  const redirect = await fetch(`${BASE}/admin/members`, { redirect: "manual" });
  check("admin redirect to login is noindex", redirect.status >= 300 && redirect.status < 400 && (redirect.headers.get("x-robots-tag") ?? "").includes("noindex"));

  const robots = await (await fetch(`${BASE}/robots.txt`)).text();
  check("robots.txt allows the site and hides admin and API", /Allow: \//.test(robots) && /Disallow: \/admin/.test(robots) && /Disallow: \/api\//.test(robots), robots.replace(/\n/g, " | "));

  // --- Health endpoint (uptime checks) ---------------------------------------
  const health = await fetch(`${BASE}/api/health`);
  const healthBody = await health.text();
  let healthJson = null;
  try {
    healthJson = JSON.parse(healthBody);
  } catch {
    /* not json */
  }
  check("health endpoint reports ok with the database up", health.status === 200 && healthJson?.ok === true && healthJson?.db === "up", `status ${health.status}`);
  check("health response is no-store and leaks no secrets", (health.headers.get("cache-control") ?? "").includes("no-store") && !/mongodb|password|salt|secret/i.test(healthBody));
  const healthPost = await fetch(`${BASE}/api/health`, { method: "POST" });
  check("health endpoint is GET-only", healthPost.status === 405, `status ${healthPost.status}`);

  // --- Rate limits -------------------------------------------------------------
  const editor = await login(emails.editor);
  const owner = await login(emails.owner);
  const missing = new ObjectId().toHexString();
  const patch = (cookie) =>
    fetch(`${BASE}/api/admin/applications/${missing}`, {
      method: "PATCH",
      headers: { "content-type": "application/json", cookie },
      body: JSON.stringify({ status: "reviewing" }),
    });

  const codes = [];
  for (let i = 0; i < 61; i += 1) codes.push((await patch(editor)).status);
  check("first 60 writes pass the limiter (404 for a missing application)", codes.slice(0, 60).every((c) => c === 404), [...new Set(codes.slice(0, 60))].join(","));
  const limited = await patch(editor);
  check("61st write in the window is 429 with Retry-After", codes[60] === 429 && limited.status === 429 && Number(limited.headers.get("retry-after")) > 0, `status ${codes[60]}`);
  check("another user is not affected", (await patch(owner)).status === 404);

  const exportUrl = `${BASE}/api/admin/applications/export?q=${"x".repeat(5)}`;
  const exportCodes = [];
  for (let i = 0; i < 11; i += 1) exportCodes.push((await fetch(exportUrl, { headers: { cookie: owner } })).status);
  check("first 10 exports pass, 11th is 429", exportCodes.slice(0, 10).every((c) => c === 200) && exportCodes[10] === 429, exportCodes.join(","));
  check("export limit does not block writes", (await patch(owner)).status === 404);
} finally {
  const all = Object.values(emails);
  const ids = (await db.collection("admin_users").find({ email: { $in: all } }).toArray()).map((u) => u._id);
  await db.collection("admin_sessions").deleteMany({ userId: { $in: ids } });
  await db.collection("admin_users").deleteMany({ email: { $in: all } });
  await db.collection("audit_logs").deleteMany({ actorEmail: { $in: all } });
  const ipHashKey = crypto.createHmac("sha256", process.env.IP_HASH_SALT).update("unknown").digest("hex");
  const keys = [
    `login:ip:${ipHashKey}`,
    ...all.map((e) => `login:email:${crypto.createHash("sha256").update(e).digest("hex")}`),
    ...ids.flatMap((id) => [`limit:write:${id}`, `limit:export:${id}`]),
  ];
  await db.collection("auth_rate_limits").deleteMany({ _id: { $in: keys } });
  await client.close();
}

const failures = results.filter((result) => !result.pass);
console.log(`\n${results.length - failures.length}/${results.length} checks passed`);
if (failures.length > 0) {
  console.log("Failures:", failures.map((failure) => failure.name).join(", "));
  process.exitCode = 1;
}
