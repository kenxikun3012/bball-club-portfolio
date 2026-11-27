/**
 * End-to-end tests for the applications workflow (status, notes, search, CSV).
 *
 *   npm run build && npm start -- -p 3100
 *   node --env-file=.env.local scripts/test-admin-applications.mjs
 *
 * Creates ephemeral admin users and applications, then removes everything it created.
 */
import crypto from "node:crypto";
import { MongoClient, ObjectId } from "mongodb";

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

/** Minimal RFC 4180 parser (quotes, commas and newlines inside cells). */
function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;
  const body = text.replace(/^﻿/, "");
  for (let i = 0; i < body.length; i += 1) {
    const ch = body[i];
    if (quoted) {
      if (ch === '"' && body[i + 1] === '"') {
        cell += '"';
        i += 1;
      } else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") {
      row.push(cell);
      cell = "";
    } else if (ch === "\r") {
      /* skip */
    } else if (ch === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else cell += ch;
  }
  if (cell !== "" || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}

const password = "Test-password-123!";
const users = {
  editor: `test.editor.${stamp}@example.com`,
  viewer: `test.viewer.${stamp}@example.com`,
};
const ipHashKey = crypto.createHmac("sha256", process.env.IP_HASH_SALT).update("unknown").digest("hex");

const client = new MongoClient(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 8000 });
await client.connect();
const db = client.db(process.env.MONGODB_DB ?? "bball_club");
const applications = db.collection("applications");
const createdAt = new Date();
const userIds = [];
const tag = `apptest${stamp}`;

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

async function login(email) {
  const { response } = await request("POST", "/api/admin/auth/login", { email, password });
  const match = (response.headers.get("set-cookie") ?? "").match(/admin_session=([^;]+)/);
  return match ? `admin_session=${match[1]}` : "";
}

const base = (name, extra = {}) => ({
  name,
  email: `${name.replace(/\W+/g, "").toLowerCase()}.${tag}@example.com`,
  phone: "0123456789",
  position: "Guard",
  year: "Year 2",
  message: "Hello",
  consent: true,
  status: "new",
  source: "test",
  ipHash: "SECRET-IP-HASH",
  userAgent: "SECRET-UA",
  createdAt: new Date(Date.now() - 1000),
  ...extra,
});

try {
  for (const [role, email] of Object.entries(users)) {
    const inserted = await db.collection("admin_users").insertOne({
      email,
      role,
      passwordHash: hashPassword(password),
      disabled: false,
      createdAt,
      updatedAt: createdAt,
    });
    userIds.push(inserted.insertedId);
  }
  const editor = await login(users.editor);
  const viewer = await login(users.viewer);
  check("editor and viewer can log in", Boolean(editor) && Boolean(viewer));

  const seeded = await applications.insertMany([
    base(`Alpha ${tag}`),
    base(`=HYPERLINK("x") ${tag}`, { message: 'Say "hi", ok\nsecond line' }),
    base(`Legacy ${tag}`),
  ]);
  const [alphaId, formulaId, legacyId] = Object.values(seeded.insertedIds).map(String);
  await applications.updateOne({ _id: new ObjectId(legacyId) }, { $unset: { status: "" } });

  // --- PATCH: guards -------------------------------------------------------
  const url = (id) => `/api/admin/applications/${id}`;
  let r = await request("PATCH", url(alphaId), { status: "reviewing" });
  check("PATCH unauthenticated is 401", r.response.status === 401, `status ${r.response.status}`);
  r = await request("PATCH", url(alphaId), { status: "reviewing" }, viewer);
  check("PATCH as viewer is 403", r.response.status === 403, `status ${r.response.status}`);
  r = await request("PATCH", url(alphaId), { status: "reviewing" }, editor, { origin: "https://evil.example" });
  check("PATCH cross-origin is 403", r.response.status === 403, `status ${r.response.status}`);
  const nonJson = await fetch(BASE + url(alphaId), {
    method: "PATCH",
    headers: { "content-type": "text/plain", cookie: editor },
    body: "{}",
  });
  check("PATCH wrong content type is 415", nonJson.status === 415, `status ${nonJson.status}`);
  r = await request("PATCH", url("not-an-id"), { status: "reviewing" }, editor);
  check("PATCH invalid id is 404", r.response.status === 404, `status ${r.response.status}`);
  r = await request("PATCH", url(new ObjectId().toHexString()), { status: "reviewing" }, editor);
  check("PATCH unknown id is 404", r.response.status === 404, `status ${r.response.status}`);
  for (const bad of [{ status: "bogus" }, { status: "accepted", extra: 1 }, {}, { addNote: "" }, { addNote: "x".repeat(1001) }]) {
    r = await request("PATCH", url(alphaId), bad, editor);
    check(`PATCH rejects ${JSON.stringify(bad).slice(0, 40)}`, r.response.status === 422, `status ${r.response.status}`);
  }

  // --- PATCH: status -------------------------------------------------------
  r = await request("PATCH", url(alphaId), { status: "reviewing" }, editor);
  const stored = await applications.findOne({ _id: new ObjectId(alphaId) });
  check(
    "editor can change status",
    r.response.status === 200 && r.json?.application?.status === "reviewing" && stored.status === "reviewing",
    `status ${r.response.status}`,
  );
  check("response never includes IP data", !r.text.includes("SECRET-IP-HASH") && !r.text.includes("SECRET-UA"));
  const statusAudit = await db.collection("audit_logs").findOne({ actorEmail: users.editor, action: "application.status" });
  check(
    "status change is audited",
    Boolean(statusAudit) && statusAudit.changes?.includes("status:new→reviewing"),
  );
  r = await request("PATCH", url(legacyId), { status: "shortlisted" }, editor);
  check("legacy application without status can be updated", r.response.status === 200 && r.json?.application?.status === "shortlisted");

  // --- PATCH: notes --------------------------------------------------------
  r = await request("PATCH", url(alphaId), { addNote: "  first note  " }, editor);
  check(
    "editor can add a note (trimmed, author recorded)",
    r.response.status === 200 &&
      r.json?.application?.notes?.[0]?.text === "first note" &&
      r.json?.application?.notes?.[0]?.authorEmail === users.editor,
  );
  const noteAudit = await db.collection("audit_logs").findOne({ actorEmail: users.editor, action: "application.note" });
  check("note is audited without its text", Boolean(noteAudit) && !JSON.stringify(noteAudit).includes("first note"));

  await Promise.all([
    request("PATCH", url(alphaId), { addNote: "parallel A" }, editor),
    request("PATCH", url(alphaId), { addNote: "parallel B" }, editor),
  ]);
  const afterParallel = await applications.findOne({ _id: new ObjectId(alphaId) });
  check("concurrent notes both persist", afterParallel.notes.length === 3, `notes ${afterParallel.notes.length}`);

  await applications.updateOne(
    { _id: new ObjectId(alphaId) },
    { $set: { notes: Array.from({ length: 100 }, (_, i) => ({ id: `n${i}`, text: "x", authorEmail: "a@b.c", createdAt: new Date() })) } },
  );
  r = await request("PATCH", url(alphaId), { addNote: "one too many" }, editor);
  check("101st note is rejected with 422", r.response.status === 422, `status ${r.response.status}`);

  // --- List page -----------------------------------------------------------
  const page = (qs, cookie) => request("GET", `/admin/applications${qs}`, undefined, cookie);
  r = await page(`?status=bogus&page=abc&q=${tag}`, editor);
  check("list tolerates bad status/page", r.response.status === 200, `status ${r.response.status}`);
  check("list shows seeded applications and Export link for editor", r.text.includes(`Alpha ${tag}`) && r.text.includes("/api/admin/applications/export"));
  r = await page(`?q=${tag}`, viewer);
  check("viewer sees the list without the Export link", r.response.status === 200 && !r.text.includes("/api/admin/applications/export"));
  r = await page(`?q=.*`, editor);
  check("regex characters in search match literally", r.response.status === 200 && !r.text.includes(`Alpha ${tag}`));
  r = await page(`?q=${tag}&page=999`, editor);
  check("page beyond the end falls back to the last page", r.response.status === 200 && r.text.includes(tag));
  r = await page(`?q=Alpha%20${tag}&status=reviewing`, editor);
  check("search and status filters combine", r.text.includes(`Alpha ${tag}`) && !r.text.includes(`Legacy ${tag}`));
  r = await page(`?q=Legacy%20${tag}&status=shortlisted`, editor);
  check("legacy application shows under its updated status", r.text.includes(`Legacy ${tag}`));

  // --- Export --------------------------------------------------------------
  const exportUrl = "/api/admin/applications/export";
  r = await request("GET", exportUrl);
  check("export unauthenticated is 401", r.response.status === 401, `status ${r.response.status}`);
  r = await request("GET", exportUrl, undefined, viewer);
  check("export as viewer is 403", r.response.status === 403, `status ${r.response.status}`);
  r = await request("GET", `${exportUrl}?q=${tag}`, undefined, editor);
  check(
    "export returns CSV with no-store and BOM",
    r.response.status === 200 &&
      (r.response.headers.get("content-type") ?? "").startsWith("text/csv") &&
      (r.response.headers.get("cache-control") ?? "").includes("no-store"),
    `status ${r.response.status}`,
  );
  const rawExport = new Uint8Array(
    await (await fetch(`${BASE}${exportUrl}?q=${tag}`, { headers: { cookie: editor } })).arrayBuffer(),
  );
  check("export starts with a UTF-8 BOM", rawExport[0] === 0xef && rawExport[1] === 0xbb && rawExport[2] === 0xbf);
  const rows = parseCsv(r.text);
  check("export header and row count are correct", rows[0]?.join(",") === "name,email,phone,position,year,status,received,message" && rows.length === 4, `rows ${rows.length}`);
  const formulaRow = rows.find((row) => row[0]?.includes("HYPERLINK"));
  check("formula-like cell is defused", formulaRow?.[0]?.startsWith("'="));
  check("quotes, commas and newlines stay in one cell", formulaRow?.[7] === `Say "hi", ok\nsecond line` && formulaRow?.length === 8);
  check("export never includes IP data", !r.text.includes("SECRET-IP-HASH") && !r.text.includes("SECRET-UA"));
  r = await request("GET", `${exportUrl}?q=${tag}&status=shortlisted`, undefined, editor);
  check("export honours the status filter", parseCsv(r.text).length === 2);
  const exportAudit = await db.collection("audit_logs").findOne({ actorEmail: users.editor, action: "application.export" });
  check("export is audited with row count", Boolean(exportAudit) && exportAudit.changes?.some((c) => c.startsWith("rows:")));
} finally {
  await applications.deleteMany({ email: { $regex: `${tag}@example\\.com$` } });
  if (userIds.length > 0) await db.collection("admin_sessions").deleteMany({ userId: { $in: userIds } });
  await db.collection("admin_users").deleteMany({ email: { $in: Object.values(users) } });
  await db.collection("audit_logs").deleteMany({ actorEmail: { $in: Object.values(users) } });
  await db.collection("auth_rate_limits").deleteMany({ _id: `login:ip:${ipHashKey}` });
  for (const email of Object.values(users)) {
    const emailHash = crypto.createHash("sha256").update(email).digest("hex");
    await db.collection("auth_rate_limits").deleteMany({ _id: `login:email:${emailHash}` });
  }
  await client.close();
}

const failures = results.filter((result) => !result.pass);
console.log(`\n${results.length - failures.length}/${results.length} checks passed`);
if (failures.length > 0) {
  console.log("Failures:", failures.map((failure) => failure.name).join(", "));
  process.exitCode = 1;
}
