/**
 * Integration tests for POST /api/join.
 *
 * Requires: server running + .env.local with MONGODB_URI, IP_HASH_SALT.
 *   npm start -- -p 3100
 *   node --env-file=.env.local scripts/test-join.mjs
 */
import crypto from "node:crypto";
import { MongoClient } from "mongodb";

const BASE = process.env.TEST_BASE ?? "http://127.0.0.1:3100";
const stamp = Date.now();
const results = [];

function check(name, pass, detail = "") {
  results.push({ name, pass, detail });
  console.log(`${pass ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
}

async function post(payload, headers = {}) {
  const response = await fetch(`${BASE}/api/join`, {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(payload),
  });
  let json = null;
  try {
    json = await response.json();
  } catch {
    /* non-JSON response */
  }
  return { response, json };
}

const base = () => ({
  name: "Test Player",
  email: `test.valid.${stamp}.${Math.random().toString(36).slice(2, 7)}@example.com`,
  phone: "+1 (555) 123-4567",
  position: "Point guard",
  year: "Freshman",
  message: "Testing the join endpoint.",
  consent: true,
});

const client = new MongoClient(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 8000 });
await client.connect();
const db = client.db(process.env.MONGODB_DB ?? "bball_club");
const applications = db.collection("applications");
const limits = db.collection("join_rate_limits");

const touchedEmails = [];

try {
  // A. valid submission
  const valid = base();
  touchedEmails.push(valid.email);
  const a = await post(valid);
  check("valid application accepted", a.response.status === 201, `status ${a.response.status}`);

  const stored = await applications.findOne({ email: valid.email });
  check("application stored in MongoDB", Boolean(stored));
  check(
    "phone normalised server-side",
    stored?.phone === "+15551234567",
    String(stored?.phone),
  );
  check("status + ipHash set", stored?.status === "new" && /^[a-f0-9]{64}$/.test(stored?.ipHash ?? ""));
  check("createdAt is a date", stored?.createdAt instanceof Date);

  // B. bad email
  const b = await post({ ...base(), email: "not-an-email" });
  check("rejects malformed email", b.response.status === 422 && Boolean(b.json?.fields?.email));

  // C. bad phone
  const c = await post({ ...base(), phone: "12345" });
  check("rejects malformed phone", c.response.status === 422 && Boolean(c.json?.fields?.phone));

  // D. NoSQL injection attempts
  const d1 = await post({ ...base(), email: { $gt: "" } });
  check("rejects object email (operator injection)", d1.response.status === 422);
  const d2 = await post({ ...base(), $where: "sleep(1000)" });
  check("rejects unknown operator key", d2.response.status === 422);
  const d3 = await post({ ...base(), "email.foo": "x" });
  check("rejects dotted-path key", d3.response.status === 422);

  // E. honeypot
  const honeypotPayload = { ...base(), website: "http://spam.example" };
  touchedEmails.push(honeypotPayload.email);
  const e = await post(honeypotPayload);
  check("honeypot returns generic success", e.response.status === 201);
  check(
    "honeypot stores nothing",
    !(await applications.findOne({ email: honeypotPayload.email })),
  );

  // F. rate limit — 3 accepted per email per 24h, 4th rejected
  const rateEmail = `test.rate.${stamp}@example.com`;
  touchedEmails.push(rateEmail);
  const statuses = [];
  let retryAfter = null;
  for (let index = 1; index <= 4; index += 1) {
    const result = await post({ ...base(), email: rateEmail, message: `Attempt ${index}` });
    statuses.push(result.response.status);
    if (index === 4) retryAfter = Number(result.response.headers.get("retry-after") ?? 0);
  }
  check(
    "rate limit allows 3, blocks 4th",
    statuses.slice(0, 3).every((s) => s === 201) && statuses[3] === 429,
    statuses.join(","),
  );
  check("429 includes Retry-After", Number.isFinite(retryAfter) && retryAfter > 0, String(retryAfter));

  // G. cross-origin request blocked
  const g = await post(base(), { origin: "https://evil.example" });
  check("blocks cross-origin POST", g.response.status === 403);

  // H. method restrictions
  const h = await fetch(`${BASE}/api/join`);
  check("GET returns 405", h.status === 405);

  // I. oversized body
  const i = await post({ ...base(), message: "x".repeat(20000) });
  check("rejects oversized body", i.response.status === 413, `status ${i.response.status}`);

  // J. HTML / script content rejected
  const j = await post({ ...base(), message: "<script>alert(1)</script>" });
  check("rejects HTML in message", j.response.status === 422);

  // K. invalid name characters
  const k = await post({ ...base(), name: "Alex123" });
  check("rejects digits in name", k.response.status === 422);

  // L. page still renders with the form
  const page = await fetch(`${BASE}/`);
  const html = await page.text();
  check("home page renders", page.status === 200);
  check("form has phone + consent fields", html.includes('name="phone"') && html.includes('name="consent"'));
} finally {
  // Clean up test data.
  await applications.deleteMany({ email: { $in: touchedEmails } });
  await applications.deleteMany({ email: /^test\.(valid|rate)\./ });
  const keys = touchedEmails.map((email) => `email:${crypto.createHash("sha256").update(email).digest("hex")}`);
  await limits.deleteMany({ _id: { $in: keys } });
  await client.close();
}

const failures = results.filter((result) => !result.pass);
console.log(`\n${results.length - failures.length}/${results.length} checks passed`);
if (failures.length > 0) {
  console.log("Failures:", failures.map((failure) => failure.name).join(", "));
  process.exitCode = 1;
}
