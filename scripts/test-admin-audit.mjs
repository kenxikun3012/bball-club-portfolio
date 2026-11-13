/**
 * End-to-end tests for the owner-only audit viewer. Run against an ISOLATED database:
 *
 *   npm run build
 *   MONGODB_DB=bball_club_test npm start -- -p 3102
 *   MONGODB_DB=bball_club_test TEST_BASE=http://127.0.0.1:3102 \
 *     node --env-file=.env.local scripts/test-admin-audit.mjs
 */
import crypto from "node:crypto";
import { MongoClient } from "mongodb";

const BASE = process.env.TEST_BASE ?? "http://127.0.0.1:3102";
const dbName = process.env.MONGODB_DB ?? "bball_club";
if (!/test/i.test(dbName)) {
  console.error(`Refusing to run against "${dbName}": use a database name containing "test".`);
  process.exit(2);
}

const stamp = Date.now();
const tag = `audtest${stamp}`;
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
const emails = {
  owner: `own.er${stamp}@example.com`,
  editor: `edi.tor${stamp}@example.com`,
  viewer: `vie.wer${stamp}@example.com`,
};
const actor = `${tag}@example.com`;

const client = new MongoClient(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 8000 });
await client.connect();
const db = client.db(dbName);
const audit = db.collection("audit_logs");

async function get(path, cookie) {
  const response = await fetch(BASE + path, { redirect: "manual", headers: cookie ? { cookie } : {} });
  // React SSR separates adjacent text nodes with <!-- --> markers; drop them for matching.
  return { response, text: (await response.text()).replace(/<!--.*?-->/g, "") };
}

async function login(email) {
  const response = await fetch(`${BASE}/api/admin/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password: PW }),
  });
  const match = (response.headers.get("set-cookie") ?? "").match(/admin_session=([^;]+)/);
  return match ? `admin_session=${match[1]}` : "";
}

const entries = (text) => Number(text.match(/(\d+) entries/)?.[1] ?? -1);
const pageOf = (text) => text.match(/Page (\d+) of (\d+)/)?.slice(1, 3).map(Number) ?? [];

try {
  const now = new Date();
  for (const [role, email] of Object.entries(emails)) {
    await db.collection("admin_users").insertOne({
      email,
      role,
      passwordHash: hashPassword(PW),
      disabled: false,
      createdAt: now,
      updatedAt: now,
    });
  }
  const owner = await login(emails.owner);
  const editor = await login(emails.editor);
  const viewer = await login(emails.viewer);

  const row = (action, date, i) => ({
    actorEmail: actor,
    action,
    entity: "test",
    entityId: `e${i}`,
    changes: [`field${i}`],
    ipHash: "SECRET-IP-HASH",
    userAgent: "SECRET-UA",
    createdAt: new Date(`${date}T12:00:00Z`),
  });
  await audit.insertMany([
    ...Array.from({ length: 60 }, (_, i) => row("content.update", "2020-01-15", i)),
    ...Array.from({ length: 55 }, (_, i) => row("login", "2020-03-10", i)),
    ...Array.from({ length: 5 }, (_, i) => row("user.reset", "2020-03-10", i)),
  ]);

  // Access control.
  let r = await get("/admin/audit");
  check("anonymous is redirected to login", r.response.status >= 300 && r.response.status < 400, `status ${r.response.status}`);
  for (const [label, cookie] of [["editor", editor], ["viewer", viewer]]) {
    r = await get("/admin/audit", cookie);
    check(`${label} is redirected away`, r.response.status >= 300 && r.response.status < 400 && (r.response.headers.get("location") ?? "").endsWith("/admin"), `status ${r.response.status}`);
  }
  r = await get("/admin/audit", owner);
  check("owner gets the page", r.response.status === 200, `status ${r.response.status}`);
  check("owner nav links to the audit log", r.text.includes('href="/admin/audit"'));
  r = await get("/admin", editor);
  check("editor nav hides the audit log", !r.text.includes('href="/admin/audit"'));

  // Filters and paging.
  const q = (qs) => get(`/admin/audit?actor=${tag}${qs}`, owner);
  r = await q("");
  check("actor filter finds all seeded entries", entries(r.text) === 120, `entries ${entries(r.text)}`);
  check("first page of three", pageOf(r.text).join("/") === "1/3", pageOf(r.text).join("/"));
  r = await q("&page=2");
  check("page 2 of three", pageOf(r.text).join("/") === "2/3");
  r = await q("&page=999");
  check("page beyond the end falls back to the last page", pageOf(r.text).join("/") === "3/3");
  r = await q("&page=abc");
  check("bad page falls back to page 1", r.response.status === 200 && pageOf(r.text)[0] === 1);
  r = await q("&action=user.reset");
  check("action filter", entries(r.text) === 5, `entries ${entries(r.text)}`);
  r = await q("&action=bogus");
  check("unknown action is ignored", entries(r.text) === 120);
  r = await q("&from=2020-03-01");
  check("from date filter", entries(r.text) === 60, `entries ${entries(r.text)}`);
  r = await q("&to=2020-01-15");
  check("to date is inclusive of the whole day", entries(r.text) === 60, `entries ${entries(r.text)}`);
  r = await q("&from=2020-01-16&to=2020-03-09");
  check("empty date window shows no entries", r.response.status === 200 && entries(r.text) === 0);
  r = await q("&from=garbage&to=2020-13-45");
  check("invalid dates are ignored", r.response.status === 200 && entries(r.text) === 120);
  r = await q("&action=login&from=2020-03-01&to=2020-03-31");
  check("filters combine", entries(r.text) === 55, `entries ${entries(r.text)}`);
  r = await get("/admin/audit?actor=.*", owner);
  check("regex characters in actor match literally", r.response.status === 200 && entries(r.text) === 0);
  r = await get(`/admin/audit?actor=${tag.toUpperCase()}`, owner);
  check("actor match is case-insensitive", entries(r.text) === 120);
  r = await q("");
  check("page never exposes IP hash or user agent", !r.text.includes("SECRET-IP-HASH") && !r.text.includes("SECRET-UA"));
  check("rows show actor, action and changed field names", r.text.includes(actor) && r.text.includes("content.update") && r.text.includes("field0"));
} finally {
  await audit.deleteMany({ actorEmail: actor });
  const ids = (await db.collection("admin_users").find({ email: { $in: Object.values(emails) } }).toArray()).map((u) => u._id);
  await db.collection("admin_sessions").deleteMany({ userId: { $in: ids } });
  await db.collection("admin_users").deleteMany({ email: { $in: Object.values(emails) } });
  await audit.deleteMany({ actorEmail: { $in: Object.values(emails) } });
  const ipHashKey = crypto.createHmac("sha256", process.env.IP_HASH_SALT).update("unknown").digest("hex");
  const keys = [`login:ip:${ipHashKey}`, ...Object.values(emails).map((e) => `login:email:${crypto.createHash("sha256").update(e).digest("hex")}`)];
  await db.collection("auth_rate_limits").deleteMany({ _id: { $in: keys } });
  await client.close();
}

const failures = results.filter((result) => !result.pass);
console.log(`\n${results.length - failures.length}/${results.length} checks passed`);
if (failures.length > 0) {
  console.log("Failures:", failures.map((failure) => failure.name).join(", "));
  process.exitCode = 1;
}
