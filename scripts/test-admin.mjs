/**
 * End-to-end tests for admin auth + DB-backed content.
 *
 *   npm start -- -p 3100
 *   node --env-file=.env.local scripts/test-admin.mjs
 *
 * Creates an ephemeral admin user and rate-limit entries, then cleans up.
 */
import crypto from "node:crypto";
import { MongoClient } from "mongodb";

const BASE = process.env.TEST_BASE ?? "http://127.0.0.1:3100";
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

const email = `test.admin.${stamp}@example.com`;
const password = "Test-password-123!";
const ipHashKey = crypto
  .createHmac("sha256", process.env.IP_HASH_SALT)
  .update("unknown")
  .digest("hex");

const client = new MongoClient(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 8000 });
await client.connect();
const db = client.db(process.env.MONGODB_DB ?? "bball_club");

async function jsonPost(path, body, headers = {}) {
  const response = await fetch(BASE + path, {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
  const json = await response.json().catch(() => null);
  return { response, json };
}

function cookieFrom(response) {
  const raw = response.headers.get("set-cookie") ?? "";
  const match = raw.match(/admin_session=([^;]+)/);
  return match ? `admin_session=${match[1]}` : "";
}

let sessionCookie = "";

try {
  // ephemeral admin
  await db.collection("admin_users").insertOne({
    email,
    role: "owner",
    passwordHash: hashPassword(password),
    disabled: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  // 1. unauthenticated page redirect
  const page = await fetch(`${BASE}/admin`, { redirect: "manual" });
  check(
    "unauthenticated /admin redirects to login",
    page.status >= 300 && page.status < 400 && (page.headers.get("location") ?? "").includes("/admin/login"),
    `status ${page.status}`,
  );

  // 2. login page renders
  const loginPage = await fetch(`${BASE}/admin/login`);
  check("login page renders", loginPage.status === 200);

  // 3. CSRF: foreign origin rejected
  const csrf = await jsonPost("/api/admin/auth/login", { email, password }, { origin: "https://evil.example" });
  check("blocks cross-origin login", csrf.response.status === 403);

  // 4. wrong password
  const wrong = await jsonPost("/api/admin/auth/login", { email, password: "wrong-password" });
  check("rejects wrong password", wrong.response.status === 401);

  // 5. correct login
  const login = await jsonPost("/api/admin/auth/login", { email, password });
  sessionCookie = cookieFrom(login.response);
  check("accepts valid login", login.response.status === 200 && Boolean(sessionCookie), `status ${login.response.status}`);
  check("sets httpOnly session cookie", (login.response.headers.get("set-cookie") ?? "").toLowerCase().includes("httponly"));

  const sessionDoc = await db.collection("admin_sessions").findOne({});
  check("session stored in MongoDB", Boolean(sessionDoc) && typeof sessionDoc.tokenHash === "string");

  // 6. authenticated pages
  const dash = await fetch(`${BASE}/admin`, { headers: { cookie: sessionCookie } });
  const dashHtml = await dash.text();
  check("authenticated dashboard renders", dash.status === 200 && dashHtml.includes("Overview."));
  const members = await fetch(`${BASE}/admin/members`, { headers: { cookie: sessionCookie } });
  const membersHtml = await members.text();
  check(
    "members page renders seeded content",
    members.status === 200 && membersHtml.includes("Members.") && membersHtml.includes("Point Guard"),
  );

  // 7. admin API without cookie is blocked by middleware
  const noCookieApi = await fetch(`${BASE}/api/admin/nope`, { redirect: "manual" });
  check("unauthenticated admin API returns 401", noCookieApi.status === 401, `status ${noCookieApi.status}`);

  // 8. logout revokes the session
  const logout = await fetch(`${BASE}/api/admin/auth/logout`, {
    method: "POST",
    headers: { cookie: sessionCookie },
  });
  check("logout succeeds", logout.status === 200);
  const afterLogout = await fetch(`${BASE}/admin`, { headers: { cookie: sessionCookie }, redirect: "manual" });
  check(
    "session revoked after logout",
    afterLogout.status >= 300 && afterLogout.status < 400,
    `status ${afterLogout.status}`,
  );

  // 9. rate limiting: 6 failed attempts for an unknown email
  const rateEmail = `test.ratelimit.${stamp}@example.com`;
  const statuses = [];
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const result = await jsonPost("/api/admin/auth/login", { email: rateEmail, password: "nope" });
    statuses.push(result.response.status);
  }
  check(
    "login rate limit blocks after 5 attempts",
    statuses.slice(0, 5).every((status) => status === 401) && statuses[5] === 429,
    statuses.join(","),
  );

  // 10. public site reads content from MongoDB (live, no rebuild)
  const before = await fetch(`${BASE}/`);
  const beforeHtml = await before.text();
  check("public site renders", before.status === 200);

  const content = db.collection("content");
  const clubDoc = await content.findOne({ _id: "club" });
  if (clubDoc) {
    const liveTag = `Live DB tagline ${stamp}`;
    await content.updateOne({ _id: "club" }, { $set: { "data.tagline": liveTag } });
    const after = await fetch(`${BASE}/`);
    const afterHtml = await after.text();
    check("public site reflects DB changes without rebuild", afterHtml.includes(liveTag));
    await content.updateOne({ _id: "club" }, { $set: { "data.tagline": clubDoc.data.tagline } });
  } else {
    check("content seeded in MongoDB", false, "club document missing — run npm run db:seed");
  }
} finally {
  // cleanup
  await db.collection("admin_users").deleteMany({ email });
  await db.collection("admin_sessions").deleteMany({});
  await db.collection("auth_rate_limits").deleteMany({
    _id: { $in: [`login:ip:${ipHashKey}`] },
  });
  await db.collection("auth_rate_limits").deleteMany({ _id: /login:email:/ });
  await db.collection("audit_logs").deleteMany({ actorEmail: email });
  await client.close();
}

const failures = results.filter((result) => !result.pass);
console.log(`\n${results.length - failures.length}/${results.length} checks passed`);
if (failures.length > 0) {
  console.log("Failures:", failures.map((failure) => failure.name).join(", "));
  process.exitCode = 1;
}
