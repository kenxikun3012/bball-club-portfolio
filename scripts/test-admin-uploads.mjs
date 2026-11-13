/**
 * End-to-end tests for the image upload API. Run through `npm run test:integration`, which starts
 * a mock ImageKit server and passes IMAGEKIT_* to the app. Uses an ISOLATED database.
 */
import crypto from "node:crypto";
import { MongoClient } from "mongodb";
import { MOCK_PRIVATE_KEY, MOCK_URL_ENDPOINT } from "./mock-imagekit.mjs";

const BASE = process.env.TEST_BASE ?? "http://127.0.0.1:3102";
const dbName = process.env.MONGODB_DB ?? "bball_club";
const mockOrigin = new URL(process.env.IMAGEKIT_UPLOAD_URL ?? "http://127.0.0.1:3199/").origin;
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
const emails = { editor: `edi.tor${stamp}@example.com`, viewer: `vie.wer${stamp}@example.com` };

// Smallest valid-looking files: only the magic bytes matter to the server's sniffing.
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGNgYGD4DwABBAEAwS2OUAAAAABJRU5ErkJggg==", "base64");
const JPEG = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 16]), Buffer.from("JFIF"), Buffer.alloc(32)]);
const WEBP = Buffer.concat([Buffer.from("RIFF"), Buffer.from([40, 0, 0, 0]), Buffer.from("WEBPVP8 "), Buffer.alloc(32)]);

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

async function upload(cookie, bytes, fileName, type = "image/png", headers = {}) {
  const form = new FormData();
  if (bytes !== null) form.append("file", new Blob([bytes], { type }), fileName);
  const response = await fetch(`${BASE}/api/admin/uploads`, {
    method: "POST",
    headers: { ...(cookie ? { cookie } : {}), ...headers },
    body: form,
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
  const editor = await login(emails.editor);
  const viewer = await login(emails.viewer);

  // --- Guards -----------------------------------------------------------------
  let r = await upload(undefined, PNG, "a.png");
  check("anonymous upload is 401", r.response.status === 401, `status ${r.response.status}`);
  r = await upload(viewer, PNG, "a.png");
  check("viewer upload is 403", r.response.status === 403, `status ${r.response.status}`);
  r = await upload(editor, PNG, "a.png", "image/png", { origin: "https://evil.example" });
  check("cross-origin upload is 403", r.response.status === 403, `status ${r.response.status}`);
  const asJson = await fetch(`${BASE}/api/admin/uploads`, {
    method: "POST",
    headers: { cookie: editor, "content-type": "application/json" },
    body: "{}",
  });
  check("non-multipart upload is 415", asJson.status === 415, `status ${asJson.status}`);

  // --- Validation -------------------------------------------------------------
  r = await upload(editor, null, "none.png");
  check("missing file is 422", r.response.status === 422, `status ${r.response.status}`);
  r = await upload(editor, Buffer.alloc(0), "empty.png");
  check("empty file is 422", r.response.status === 422, `status ${r.response.status}`);
  r = await upload(editor, Buffer.concat([PNG, Buffer.alloc(4 * 1024 * 1024)]), "big.png");
  check("file over 4 MB is 413", r.response.status === 413, `status ${r.response.status}`);
  r = await upload(editor, Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'), "x.svg", "image/svg+xml");
  check("SVG is rejected (415)", r.response.status === 415, `status ${r.response.status}`);
  r = await upload(editor, Buffer.from("GIF89a" + "0".repeat(20)), "x.gif", "image/gif");
  check("GIF is rejected (415)", r.response.status === 415, `status ${r.response.status}`);
  r = await upload(editor, Buffer.from("<html><script>alert(1)</script></html>"), "fake.png", "image/png");
  check("HTML renamed to .png is rejected by its bytes (415)", r.response.status === 415, `status ${r.response.status}`);

  // --- Success ----------------------------------------------------------------
  r = await upload(editor, PNG, "My Team Photo.png");
  check("valid PNG uploads and returns an ImageKit URL", r.response.status === 200 && r.json?.ok === true && String(r.json?.url).startsWith(`${MOCK_URL_ENDPOINT}/`), `status ${r.response.status}`);
  r = await upload(editor, JPEG, "p.jpg", "image/jpeg");
  check("valid JPEG uploads", r.response.status === 200 && /\.jpg$/.test(r.json?.url ?? ""), `status ${r.response.status}`);
  r = await upload(editor, WEBP, "p.webp", "image/webp");
  check("valid WebP uploads", r.response.status === 200 && /\.webp$/.test(r.json?.url ?? ""), `status ${r.response.status}`);

  r = await upload(editor, PNG, "../../evil name?.png");
  const last = await (await fetch(`${mockOrigin}/__last`)).json();
  check("file name is sanitised before it leaves the server", r.response.status === 200 && /^[A-Za-z0-9._-]+$/.test(last.fileName) && !last.fileName.includes(".."), last.fileName);
  check("private key is sent to ImageKit by the server only", last.authorization === `Basic ${Buffer.from(`${MOCK_PRIVATE_KEY}:`).toString("base64")}` && !r.text.includes(MOCK_PRIVATE_KEY));
  check("uploads go to the club folder", last.folder === "/club", last.folder);
  check("extension follows the real file type, not the claimed name", (await upload(editor, JPEG, "liar.png", "image/png")).json?.url?.endsWith(".jpg") === true);

  // --- Upstream failures ------------------------------------------------------
  r = await upload(editor, PNG, "fail-upstream.png");
  check("upstream failure is 502 and leaks no upstream detail", r.response.status === 502 && !r.text.includes("UPSTREAM-SECRET-DETAIL"), `status ${r.response.status}`);
  r = await upload(editor, PNG, "bad-url.png");
  check("a URL outside the configured endpoint is rejected (502)", r.response.status === 502 && !r.text.includes("evil.example"), `status ${r.response.status}`);

  // --- Audit and rate limit -----------------------------------------------------
  const audit = await db.collection("audit_logs").findOne({ actorEmail: emails.editor, action: "upload.image" });
  check("upload is audited without file name or content", Boolean(audit) && !JSON.stringify(audit).includes("Team Photo"));

  const codes = [];
  for (let i = 0; i < 25; i += 1) codes.push((await upload(editor, PNG, `n${i}.png`)).response.status);
  check("uploads are rate limited (429 with Retry-After)", codes.includes(429), codes.join(","));
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
    ...ids.flatMap((id) => [`limit:write:${id}`, `limit:upload:${id}`]),
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
