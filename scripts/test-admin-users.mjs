/**
 * End-to-end tests for admin-user management and password change.
 *
 * Run against an ISOLATED database so owner-count checks never touch real owners:
 *
 *   npm run build
 *   MONGODB_DB=bball_club_test npm start -- -p 3102
 *   MONGODB_DB=bball_club_test TEST_BASE=http://127.0.0.1:3102 \
 *     node --env-file=.env.local scripts/test-admin-users.mjs
 *
 * Creates ephemeral admin users and removes everything it created.
 */
import crypto from "node:crypto";
import { MongoClient } from "mongodb";

const BASE = process.env.TEST_BASE ?? "http://127.0.0.1:3102";
const dbName = process.env.MONGODB_DB ?? "bball_club";
if (!/test/i.test(dbName)) {
  console.error(`Refusing to run against "${dbName}": set MONGODB_DB to a database name containing "test".`);
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
const emails = {
  owner: `own.er${stamp}@example.com`,
  owner2: `own.er2${stamp}@example.com`,
  editor: `edi.tor${stamp}@example.com`,
  viewer: `vie.wer${stamp}@example.com`,
  forced: `forced.user${stamp}@example.com`,
  throttle: `thr.ottle${stamp}@example.com`,
};
const created = []; // extra emails made through the API

const client = new MongoClient(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 8000 });
await client.connect();
const db = client.db(dbName);
const users = db.collection("admin_users");

async function request(method, path, body, cookie, headers = {}) {
  const response = await fetch(BASE + path, {
    method,
    redirect: "manual",
    headers: {
      ...(body === undefined ? {} : { "content-type": "application/json" }),
      ...(cookie ? { cookie } : {}),
      ...headers,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    /* not json */
  }
  return { response, json, text };
}

async function login(email, password = PW) {
  const { response } = await request("POST", "/api/admin/auth/login", { email, password });
  const match = (response.headers.get("set-cookie") ?? "").match(/admin_session=([^;]+)/);
  return match ? `admin_session=${match[1]}` : "";
}

async function seed(email, role, extra = {}) {
  const now = new Date();
  const result = await users.insertOne({
    email,
    role,
    passwordHash: hashPassword(PW),
    disabled: false,
    createdAt: now,
    updatedAt: now,
    ...extra,
  });
  return result.insertedId;
}

const idOf = async (email) => String((await users.findOne({ email }))._id);

try {
  await seed(emails.owner, "owner");
  await seed(emails.owner2, "owner");
  await seed(emails.editor, "editor");
  await seed(emails.viewer, "viewer");
  await seed(emails.forced, "editor", { mustChangePassword: true });
  await seed(emails.throttle, "editor");

  const owner = await login(emails.owner);
  const owner2 = await login(emails.owner2);
  const editor = await login(emails.editor);
  const viewer = await login(emails.viewer);
  check("seeded users can log in", [owner, owner2, editor, viewer].every(Boolean));

  // --- Forced password change gate ----------------------------------------
  const forced = await login(emails.forced);
  check("must-change user can log in", Boolean(forced));
  let r = await request("GET", "/api/admin/applications/export", undefined, forced);
  check("must-change user is locked out of admin APIs", r.response.status === 401, `status ${r.response.status}`);
  r = await request("GET", "/admin/applications", undefined, forced);
  check(
    "must-change user is redirected to the change-password page",
    r.response.status >= 300 && r.response.status < 400 && (r.response.headers.get("location") ?? "").includes("/admin/change-password"),
    `status ${r.response.status}`,
  );
  r = await request("GET", "/admin/change-password", undefined, forced);
  check("change-password page renders for a must-change user", r.response.status === 200);
  r = await request("GET", "/admin/change-password", undefined, editor);
  check("change-password page redirects users who do not need it", r.response.status >= 300 && r.response.status < 400);

  // --- Password endpoint ----------------------------------------------------
  const pwUrl = "/api/admin/auth/password";
  r = await request("POST", pwUrl, { currentPassword: PW, newPassword: "Another-pass-456" });
  check("password change unauthenticated is 401", r.response.status === 401, `status ${r.response.status}`);
  r = await request("POST", pwUrl, { currentPassword: PW, newPassword: "Another-pass-456" }, editor, { origin: "https://evil.example" });
  check("password change cross-origin is 403", r.response.status === 403);
  r = await request("POST", pwUrl, { currentPassword: "wrong", newPassword: "Another-pass-456" }, editor);
  check("wrong current password is 403", r.response.status === 403, `status ${r.response.status}`);
  const bad = {
    "too short": "short1",
    "equals email": emails.editor,
    "contains email local part (other case)": `X-${emails.editor.split("@")[0].toUpperCase()}-9`,
    "equals current": PW,
    "only spaces": "        ",
    "201 chars": "a".repeat(201),
  };
  for (const [label, newPassword] of Object.entries(bad)) {
    r = await request("POST", pwUrl, { currentPassword: PW, newPassword }, editor);
    check(`rejects new password: ${label}`, r.response.status === 422, `status ${r.response.status}`);
  }
  r = await request("POST", pwUrl, { currentPassword: PW, newPassword: "Another-pass-456", extra: 1 }, editor);
  check("password body rejects unknown keys", r.response.status === 422);

  const editorSecond = await login(emails.editor);
  const longPassword = "Zq9-" + "x".repeat(196);
  r = await request("POST", pwUrl, { currentPassword: PW, newPassword: longPassword }, editor);
  check("a 200-character password is accepted", r.response.status === 200 && longPassword.length === 200, `status ${r.response.status}`);
  r = await request("GET", "/api/admin/applications/export", undefined, editor);
  check("current session survives a password change", r.response.status === 200, `status ${r.response.status}`);
  r = await request("GET", "/api/admin/applications/export", undefined, editorSecond);
  check("other sessions are revoked by a password change", r.response.status === 401, `status ${r.response.status}`);
  check("new password works and old one does not", Boolean(await login(emails.editor, longPassword)) && !(await login(emails.editor, PW)));
  const passwordAudit = await db.collection("audit_logs").findOne({ actorEmail: emails.editor, action: "auth.password" });
  check("password change is audited without secrets", Boolean(passwordAudit) && !JSON.stringify(passwordAudit).includes(longPassword));

  r = await request("POST", pwUrl, { currentPassword: PW, newPassword: "Forced-new-pass-1" }, forced);
  check("must-change user can change their password", r.response.status === 200, `status ${r.response.status}`);
  r = await request("GET", "/api/admin/applications/export", undefined, forced);
  check("gate lifts after the password change", r.response.status === 200, `status ${r.response.status}`);

  const throttleCookie = await login(emails.throttle);
  const throttleCodes = [];
  for (let i = 0; i < 6; i += 1) {
    throttleCodes.push((await request("POST", pwUrl, { currentPassword: "nope", newPassword: "Another-pass-456" }, throttleCookie)).response.status);
  }
  check("password attempts are throttled (5 then 429)", throttleCodes.slice(0, 5).every((c) => c === 403) && throttleCodes[5] === 429, throttleCodes.join(","));

  // --- Users API: guards ----------------------------------------------------
  const targetId = await idOf(emails.viewer);
  for (const [label, cookie] of [["anonymous", undefined], ["viewer", viewer], ["editor", editor]]) {
    const status = cookie === undefined ? 401 : 403;
    const g = await request("GET", "/api/admin/users", undefined, cookie);
    const p = await request("POST", "/api/admin/users", { email: `x${stamp}@example.com`, role: "viewer" }, cookie);
    const pa = await request("PATCH", `/api/admin/users/${targetId}`, { disabled: true }, cookie);
    check(`${label}: users API is ${status}`, [g, p, pa].every((x) => x.response.status === status), [g, p, pa].map((x) => x.response.status).join(","));
  }
  const stillThere = await users.findOne({ email: emails.viewer });
  check("rejected requests changed nothing", stillThere.disabled === false && stillThere.role === "viewer");

  r = await request("GET", "/api/admin/users", undefined, owner);
  check("owner can list users without hashes", r.response.status === 200 && Array.isArray(r.json?.users) && !r.text.includes("passwordHash") && !r.text.includes("scrypt$"));

  // --- Create ---------------------------------------------------------------
  const newEmail = `bob.new${stamp}@example.com`;
  created.push(newEmail);
  r = await request("POST", "/api/admin/users", { email: `  ${newEmail.replace("bob", "Bob")}  `, role: "editor" }, owner);
  const temp = r.json?.tempPassword;
  const storedNew = await users.findOne({ email: newEmail });
  check("create returns a one-time temp password (16 chars, no-store)", r.response.status === 201 && typeof temp === "string" && temp.length === 16 && (r.response.headers.get("cache-control") ?? "").includes("no-store"), `status ${r.response.status}`);
  check("email is trimmed and lowercased", Boolean(storedNew));
  check("only a hash is stored and a change is required", Boolean(storedNew) && storedNew.mustChangePassword === true && !JSON.stringify(storedNew).includes(temp));
  r = await request("POST", "/api/admin/users", { email: newEmail.toUpperCase(), role: "viewer" }, owner);
  check("duplicate email with other casing is 409", r.response.status === 409, `status ${r.response.status}`);
  for (const bodyValue of [{ email: "nope", role: "viewer" }, { email: `z${stamp}@example.com`, role: "root" }, { email: `z${stamp}@example.com`, role: "viewer", extra: 1 }]) {
    r = await request("POST", "/api/admin/users", bodyValue, owner);
    check(`create rejects ${JSON.stringify(bodyValue).slice(0, 45)}`, r.response.status === 422, `status ${r.response.status}`);
  }
  const bobCookie = await login(newEmail, temp);
  r = await request("GET", "/api/admin/applications/export", undefined, bobCookie);
  check("new user logs in with the temp password but is gated", Boolean(bobCookie) && r.response.status === 401);
  const createAudit = await db.collection("audit_logs").findOne({ actorEmail: emails.owner, action: "user.create" });
  check("create is audited without the password", Boolean(createAudit) && !JSON.stringify(createAudit).includes(temp));

  // --- Update ---------------------------------------------------------------
  const url = (id) => `/api/admin/users/${id}`;
  r = await request("PATCH", url("not-an-id"), { disabled: true }, owner);
  check("invalid id is 404", r.response.status === 404);
  for (const bodyValue of [{}, { role: "root" }, { role: "viewer", disabled: true }, { resetPassword: false }]) {
    r = await request("PATCH", url(targetId), bodyValue, owner);
    check(`update rejects ${JSON.stringify(bodyValue)}`, r.response.status === 422, `status ${r.response.status}`);
  }
  const ownerId = await idOf(emails.owner);
  r = await request("PATCH", url(ownerId), { role: "viewer" }, owner);
  check("owner cannot change their own role", r.response.status === 403);
  r = await request("PATCH", url(ownerId), { disabled: true }, owner);
  check("owner cannot disable themselves", r.response.status === 403);
  r = await request("PATCH", url(ownerId), { resetPassword: true }, owner);
  check("owner cannot reset their own password here", r.response.status === 403);

  const viewerCookie2 = await login(emails.viewer);
  r = await request("PATCH", url(targetId), { role: "editor" }, owner);
  check("owner can change a role", r.response.status === 200 && r.json?.user?.role === "editor");
  r = await request("GET", "/api/admin/applications/export", undefined, viewerCookie2);
  check("role change revokes that user's sessions", r.response.status === 401);

  const disabledCookie = await login(emails.viewer);
  r = await request("PATCH", url(targetId), { disabled: true }, owner);
  const loginWhileDisabled = await login(emails.viewer);
  r = await request("GET", "/api/admin/applications/export", undefined, disabledCookie);
  check("disabling revokes sessions and blocks login", !loginWhileDisabled && r.response.status === 401);
  r = await request("PATCH", url(targetId), { disabled: false }, owner);
  check("re-enabling restores login", r.response.status === 200 && Boolean(await login(emails.viewer)));

  const resetCookie = await login(emails.viewer);
  r = await request("PATCH", url(targetId), { resetPassword: true }, owner);
  const resetTemp = r.json?.tempPassword;
  check("reset returns a new one-time temp password", r.response.status === 200 && typeof resetTemp === "string" && resetTemp.length === 16 && (r.response.headers.get("cache-control") ?? "").includes("no-store"));
  r = await request("GET", "/api/admin/applications/export", undefined, resetCookie);
  check("reset revokes sessions", r.response.status === 401);
  check("old password stops working and the temp one works", !(await login(emails.viewer)) && Boolean(await login(emails.viewer, resetTemp)));
  const resetDoc = await users.findOne({ email: emails.viewer });
  check("reset requires a change and clears lock state", resetDoc.mustChangePassword === true && resetDoc.failedAttempts === undefined);

  const audits = await db.collection("audit_logs").find({ actorEmail: emails.owner, action: { $regex: "^user\\." } }).toArray();
  const auditText = JSON.stringify(audits);
  check(
    "role/disable/enable/reset are audited without secrets",
    ["user.role", "user.disable", "user.enable", "user.reset"].every((action) => audits.some((a) => a.action === action)) &&
      !auditText.includes(resetTemp) && !auditText.includes(temp) && !auditText.includes("scrypt$"),
  );

  // --- Users page and nav -----------------------------------------------------
  r = await request("GET", "/admin/users", undefined, owner);
  check(
    "owner sees the Users page with emails and no hashes",
    r.response.status === 200 && r.text.includes(emails.editor) && !r.text.includes("scrypt$"),
    `status ${r.response.status}`,
  );
  check("owner nav includes Users", r.text.includes('href="/admin/users"'));
  r = await request("GET", "/admin/users", undefined, editor);
  check("editor is redirected away from the Users page", r.response.status >= 300 && r.response.status < 400 && (r.response.headers.get("location") ?? "").endsWith("/admin"), `status ${r.response.status}`);
  r = await request("GET", "/admin/settings", undefined, editor);
  check("editor nav hides Users and Settings shows the password form", r.response.status === 200 && !r.text.includes('href="/admin/users"') && r.text.includes("Change password"));

  // --- Last-owner guard under a race ---------------------------------------
  const owner2Id = await idOf(emails.owner2);
  const [a, b] = await Promise.all([
    request("PATCH", url(owner2Id), { role: "viewer" }, owner),
    request("PATCH", url(ownerId), { role: "viewer" }, owner2),
  ]);
  const activeOwners = await users.countDocuments({ role: "owner", disabled: { $ne: true } });
  check("two owners demoting each other never leave zero owners", activeOwners >= 1, `owners ${activeOwners}, statuses ${a.response.status}/${b.response.status}`);
} finally {
  const all = [...Object.values(emails), ...created];
  const ids = (await users.find({ email: { $in: all } }).toArray()).map((u) => u._id);
  if (ids.length > 0) await db.collection("admin_sessions").deleteMany({ userId: { $in: ids } });
  await users.deleteMany({ email: { $in: all } });
  await db.collection("audit_logs").deleteMany({
    $or: [{ actorEmail: { $in: all } }, { entityId: { $in: all } }],
  });
  const ipHashKey = crypto.createHmac("sha256", process.env.IP_HASH_SALT).update("unknown").digest("hex");
  const keys = [`login:ip:${ipHashKey}`, ...all.map((e) => `login:email:${crypto.createHash("sha256").update(e).digest("hex")}`), ...ids.map((id) => `pw:user:${id}`)];
  await db.collection("auth_rate_limits").deleteMany({ _id: { $in: keys } });
  await client.close();
}

const failures = results.filter((result) => !result.pass);
console.log(`\n${results.length - failures.length}/${results.length} checks passed`);
if (failures.length > 0) {
  console.log("Failures:", failures.map((failure) => failure.name).join(", "));
  process.exitCode = 1;
}
