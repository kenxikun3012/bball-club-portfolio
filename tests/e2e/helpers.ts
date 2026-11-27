import crypto from "node:crypto";
import { MongoClient, type Db } from "mongodb";
import type { Page } from "@playwright/test";

export const PASSWORD = "E2e-password-123!";
export const USERS = {
  owner: "e2e.owner@example.com",
  editor: "e2e.editor@example.com",
  viewer: "e2e.viewer@example.com",
  wrong: "e2e.wrong-password@example.com",
} as const;
export const APPLICANT = { name: "E2E Applicant", email: "e2e.applicant@example.com" };

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(password, salt, 64, { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 });
  return `scrypt$32768$8$1$${salt.toString("base64url")}$${hash.toString("base64url")}`;
}

export async function withDb<T>(fn: (db: Db) => Promise<T>): Promise<T> {
  const uri = process.env.MONGODB_URI;
  const name = process.env.MONGODB_DB ?? "";
  if (!uri) throw new Error("MONGODB_URI is not set.");
  if (!/test/i.test(name)) throw new Error(`Refusing to touch database "${name}" (must contain "test").`);
  const client = new MongoClient(uri, { serverSelectionTimeoutMS: 8000 });
  try {
    await client.connect();
    return await fn(client.db(name));
  } finally {
    await client.close();
  }
}

/** Removes everything the e2e run creates (users, sessions, applications, audit, limiter keys). */
export async function cleanup(db: Db): Promise<void> {
  const ids = (await db.collection("admin_users").find({ email: { $regex: "^e2e\\." } }).toArray()).map((u) => u._id);
  await db.collection("admin_sessions").deleteMany({ userId: { $in: ids } });
  await db.collection("admin_users").deleteMany({ email: { $regex: "^e2e\\." } });
  await db.collection("applications").deleteMany({ email: APPLICANT.email });
  await db.collection("audit_logs").deleteMany({ actorEmail: { $regex: "^e2e\\." } });
  await db.collection<{ _id: string }>("auth_rate_limits").deleteMany({ _id: { $regex: "^(login:|limit:|pw:)" } });
}

export async function seed(db: Db): Promise<void> {
  await cleanup(db);
  const now = new Date();
  await db.collection("admin_users").insertMany(
    (["owner", "editor", "viewer"] as const).map((role) => ({
      email: USERS[role],
      role,
      passwordHash: hashPassword(PASSWORD),
      disabled: false,
      createdAt: now,
      updatedAt: now,
    })),
  );
  await db.collection("admin_users").insertOne({
    email: USERS.wrong,
    role: "viewer",
    passwordHash: hashPassword(PASSWORD),
    disabled: false,
    createdAt: now,
    updatedAt: now,
  });
  await db.collection("applications").insertOne({
    ...APPLICANT,
    phone: "0123456789",
    position: "Guard",
    year: "Year 2",
    message: "Keen to join the squad.",
    consent: true,
    status: "new",
    source: "e2e",
    ipHash: "e2e",
    userAgent: "e2e",
    createdAt: now,
  });
}

/** Signs in through the API so the browser context holds a real session cookie. */
export async function loginAs(page: Page, role: "owner" | "editor" | "viewer"): Promise<void> {
  const response = await page.request.post("/api/admin/auth/login", {
    data: { email: USERS[role], password: PASSWORD },
  });
  if (!response.ok()) throw new Error(`Login as ${role} failed: ${response.status()}`);
}
