/**
 * Create or update an admin account.
 *
 *   npm run admin:create -- you@example.com owner
 *
 * Role: owner | editor | viewer (default owner).
 * Password: set ADMIN_PASSWORD, otherwise a temporary one is generated and
 * printed once. The scrypt format matches lib/auth.ts.
 */
import crypto from "node:crypto";
import { MongoClient } from "mongodb";

const SCRYPT = { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };

function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(password, salt, 64, SCRYPT);
  return `scrypt$${SCRYPT.N}$${SCRYPT.r}$${SCRYPT.p}$${salt.toString("base64url")}$${hash.toString("base64url")}`;
}

function generatePassword() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  const bytes = crypto.randomBytes(16);
  return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join("");
}

const email = (process.argv[2] ?? process.env.ADMIN_EMAIL ?? "").trim().toLowerCase();
const role = (process.argv[3] ?? "owner").trim().toLowerCase();

if (!/^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/.test(email)) {
  console.error("Usage: npm run admin:create -- <email> [owner|editor|viewer]");
  process.exit(1);
}
if (!["owner", "editor", "viewer"].includes(role)) {
  console.error("Role must be owner, editor or viewer.");
  process.exit(1);
}
const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error("MONGODB_URI is missing — add it to .env.local first.");
  process.exit(1);
}

const generated = !process.env.ADMIN_PASSWORD;
const password = process.env.ADMIN_PASSWORD ?? generatePassword();

const client = new MongoClient(uri, { serverSelectionTimeoutMS: 10_000 });
try {
  await client.connect();
  const db = client.db(process.env.MONGODB_DB ?? "bball_club");
  const users = db.collection("admin_users");
  await users.createIndex({ email: 1 }, { unique: true, name: "email_unique" });
  await db.collection("admin_sessions").createIndexes([
    { key: { tokenHash: 1 }, unique: true, name: "token_unique" },
    { key: { expiresAt: 1 }, name: "expires_ttl", expireAfterSeconds: 0 },
  ]);
  await db.collection("auth_rate_limits").createIndex(
    { expiresAt: 1 },
    { name: "expires_ttl", expireAfterSeconds: 0 },
  );

  const now = new Date();
  const existing = await users.findOne({ email });
  if (existing) {
    await users.updateOne(
      { email },
      {
        $set: {
          passwordHash: hashPassword(password),
          role,
          disabled: false,
          passwordChangedAt: now,
          updatedAt: now,
        },
      },
    );
    console.log(`updated admin ${email} (role: ${role})`);
  } else {
    await users.insertOne({
      email,
      role,
      passwordHash: hashPassword(password),
      disabled: false,
      failedAttempts: 0,
      lockedUntil: null,
      createdAt: now,
      updatedAt: now,
      lastLoginAt: null,
    });
    console.log(`created admin ${email} (role: ${role})`);
  }

  if (generated) {
    console.log(`temporary password: ${password}`);
    console.log("Sign in at /admin/login and change this password.");
  }
} finally {
  await client.close();
}
