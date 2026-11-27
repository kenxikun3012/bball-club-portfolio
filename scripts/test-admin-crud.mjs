/**
 * End-to-end tests for Phase 2 content editing.
 *
 *   npm start -- -p 3100
 *   node --env-file=.env.local scripts/test-admin-crud.mjs
 *
 * Creates ephemeral admin users, exercises the content API, then restores the
 * original content document and removes everything it created.
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

const password = "Test-password-123!";
const users = {
  editor: `test.editor.${stamp}@example.com`,
  viewer: `test.viewer.${stamp}@example.com`,
};
const ipHashKey = crypto
  .createHmac("sha256", process.env.IP_HASH_SALT)
  .update("unknown")
  .digest("hex");

const client = new MongoClient(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 8000 });
await client.connect();
const db = client.db(process.env.MONGODB_DB ?? "bball_club");
const createdAt = new Date();
const userIds = [];

async function jsonRequest(method, path, body, cookie, headers = {}) {
  const response = await fetch(BASE + path, {
    method,
    headers: {
      ...(body === undefined ? {} : { "content-type": "application/json" }),
      ...(cookie ? { cookie } : {}),
      ...headers,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const json = await response.json().catch(() => null);
  return { response, json };
}

async function login(email) {
  const { response } = await jsonRequest("POST", "/api/admin/auth/login", { email, password });
  const raw = response.headers.get("set-cookie") ?? "";
  const match = raw.match(/admin_session=([^;]+)/);
  return match ? `admin_session=${match[1]}` : "";
}

const content = db.collection("content");
const membersDocId = `members`;
const original = await content.findOne({ _id: membersDocId });

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

  const viewerCookie = await login(users.viewer);
  const editorCookie = await login(users.editor);
  check("editor can log in", Boolean(editorCookie));
  check("viewer can log in", Boolean(viewerCookie));

  // Read model.
  const read = await jsonRequest("GET", "/api/admin/content/members", undefined, viewerCookie);
  check(
    "viewer can read content with revision",
    read.response.status === 200 && typeof read.json?.revision === "number" && Boolean(read.json?.data),
    `status ${read.response.status}`,
  );

  const revision = read.json?.revision ?? 0;
  const data = read.json?.data;

  // Auth + role enforcement.
  const anonymous = await jsonRequest("PATCH", "/api/admin/content/members", {
    data,
    expectedRevision: revision,
  });
  check("unauthenticated write is rejected", anonymous.response.status === 401, `status ${anonymous.response.status}`);

  const viewerWrite = await jsonRequest(
    "PATCH",
    "/api/admin/content/members",
    { data, expectedRevision: revision },
    viewerCookie,
  );
  check("viewer write is forbidden", viewerWrite.response.status === 403, `status ${viewerWrite.response.status}`);

  const unknownDoc = await jsonRequest("GET", "/api/admin/content/secrets", undefined, editorCookie);
  check("unknown document returns 404", unknownDoc.response.status === 404, `status ${unknownDoc.response.status}`);

  // Validation.
  const operatorKey = await jsonRequest(
    "PATCH",
    "/api/admin/content/members",
    { data: { ...data, $where: "1" }, expectedRevision: revision },
    editorCookie,
  );
  check("rejects unknown operator keys", operatorKey.response.status === 422, `status ${operatorKey.response.status}`);

  const duplicate = structuredClone(data);
  const roster = duplicate.rosters?.find((item) => item.players?.length >= 2);
  if (roster) roster.players[1].number = roster.players[0].number;
  const duplicateWrite = await jsonRequest(
    "PATCH",
    "/api/admin/content/members",
    { data: duplicate, expectedRevision: revision },
    editorCookie,
  );
  check(
    "rejects duplicate jersey numbers in a roster",
    duplicateWrite.response.status === 422,
    `status ${duplicateWrite.response.status}`,
  );

  const badImage = structuredClone(data);
  if (badImage.rosters?.[0]?.players?.[0]) {
    badImage.rosters[0].players[0].image = "javascript:alert(1)";
  }
  const badImageWrite = await jsonRequest(
    "PATCH",
    "/api/admin/content/members",
    { data: badImage, expectedRevision: revision },
    editorCookie,
  );
  check("rejects non-https image URLs", badImageWrite.response.status === 422, `status ${badImageWrite.response.status}`);

  // Prime the public content cache so the save below must invalidate it.
  await fetch(`${BASE}/`);

  // Valid write.
  const next = structuredClone(data);
  const marker = `Updated by CRUD test ${stamp}`;
  if (next.staff?.[0]) next.staff[0].detail = marker;

  const saved = await jsonRequest(
    "PATCH",
    "/api/admin/content/members",
    { data: next, expectedRevision: revision },
    editorCookie,
  );
  check(
    "editor can save a valid document",
    saved.response.status === 200 && saved.json?.revision === revision + 1,
    `status ${saved.response.status} revision ${saved.json?.revision}`,
  );

  const after = await jsonRequest("GET", "/api/admin/content/members", undefined, editorCookie);
  check(
    "saved data is returned on the next read",
    after.response.status === 200 && after.json?.data?.staff?.[0]?.detail === marker,
  );

  // Stale revision.
  const stale = structuredClone(next);
  if (stale.staff?.[0]) stale.staff[0].detail = "stale write";
  const conflict = await jsonRequest(
    "PATCH",
    "/api/admin/content/members",
    { data: stale, expectedRevision: revision },
    editorCookie,
  );
  check(
    "stale revision returns 409 with the current revision",
    conflict.response.status === 409 && conflict.json?.revision === revision + 1,
    `status ${conflict.response.status} revision ${conflict.json?.revision}`,
  );

  // Audit trail.
  const audit = await db.collection("audit_logs").findOne({
    actorEmail: users.editor,
    action: "content.update",
    entityId: "members",
  });
  check(
    "content write is audit-logged with changed field names only",
    Boolean(audit) &&
      Array.isArray(audit.changes) &&
      audit.changes.includes("staff") &&
      !JSON.stringify(audit.changes).includes(marker),
  );

  // Public site reflects the write without a rebuild.
  const publicPage = await fetch(`${BASE}/`);
  const publicHtml = await publicPage.text();
  check(
    "public site shows the saved content immediately",
    publicPage.status === 200 && publicHtml.includes(marker),
  );

  // The cache is really active: a direct database edit (no invalidation) is not served...
  const ghost = `Direct DB edit ${stamp}`;
  await content.updateOne({ _id: membersDocId }, { $set: { "data.staff.0.detail": ghost } });
  const cachedHtml = await (await fetch(`${BASE}/`)).text();
  check(
    "public content is served from the cache until invalidated",
    cachedHtml.includes(marker) && !cachedHtml.includes(ghost),
  );

  // ...but a save through the admin API invalidates it immediately.
  const marker2 = `Second save ${stamp}`;
  const next2 = structuredClone(next);
  if (next2.staff?.[0]) next2.staff[0].detail = marker2;
  const saved2 = await jsonRequest(
    "PATCH",
    "/api/admin/content/members",
    { data: next2, expectedRevision: revision + 1 },
    editorCookie,
  );
  const freshHtml = await (await fetch(`${BASE}/`)).text();
  check(
    "saving invalidates the cache so the new content shows at once",
    saved2.response.status === 200 && freshHtml.includes(marker2) && !freshHtml.includes(ghost),
    `status ${saved2.response.status}`,
  );
} finally {
  if (original) {
    await content.replaceOne({ _id: original._id }, original);
  } else {
    await content.deleteOne({ _id: membersDocId });
  }
  if (userIds.length > 0) {
    await db.collection("admin_sessions").deleteMany({ userId: { $in: userIds } });
  }
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
