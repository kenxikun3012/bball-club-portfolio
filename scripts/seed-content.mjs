/**
 * Seed the MongoDB `content` collection from the JSON files in /content.
 * Idempotent: existing documents keep their revision, data is refreshed.
 *
 *   npm run db:seed
 *   (script runs with --env-file=.env.local)
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { MongoClient } from "mongodb";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const DOCUMENTS = [
  { id: "club", file: "club.json" },
  { id: "members", file: "members.json" },
  { id: "hallOfFame", file: "hall-of-fame.json" },
  { id: "achievements", file: "achievements.json" },
  { id: "activities", file: "activities.json" },
];

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error("MONGODB_URI is missing — add it to .env.local first.");
  process.exit(1);
}

const client = new MongoClient(uri, { serverSelectionTimeoutMS: 10_000 });
try {
  await client.connect();
  const db = client.db(process.env.MONGODB_DB ?? "bball_club");
  const content = db.collection("content");

  for (const { id, file } of DOCUMENTS) {
    const raw = fs.readFileSync(path.join(ROOT, "content", file), "utf8");
    const data = JSON.parse(raw);
    await content.updateOne(
      { _id: id },
      {
        $set: { data, updatedAt: new Date(), updatedBy: "seed" },
        $setOnInsert: { revision: 1 },
      },
      { upsert: true },
    );
    console.log(`seeded content/${id} from content/${file}`);
  }

  // Indexes for the admin/auth collections (created here so a fresh
  // environment is fully provisioned after seeding).
  await db.collection("admin_users").createIndex(
    { email: 1 },
    { unique: true, name: "email_unique" },
  );
  await db.collection("admin_sessions").createIndexes([
    { key: { tokenHash: 1 }, unique: true, name: "token_unique" },
    { key: { expiresAt: 1 }, name: "expires_ttl", expireAfterSeconds: 0 },
  ]);
  await db.collection("auth_rate_limits").createIndex(
    { expiresAt: 1 },
    { name: "expires_ttl", expireAfterSeconds: 0 },
  );
  await db.collection("audit_logs").createIndex({ createdAt: -1 }, { name: "created" });

  console.log("done — content documents and indexes are in place.");
} finally {
  await client.close();
}
