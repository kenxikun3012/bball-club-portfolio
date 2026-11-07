/** Connectivity check: node --env-file=.env.local scripts/test-mongo.mjs */
import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error("MONGODB_URI missing — add it to .env.local first.");
  process.exit(1);
}

const client = new MongoClient(uri, { serverSelectionTimeoutMS: 8000 });
try {
  await client.connect();
  const db = client.db(process.env.MONGODB_DB ?? "bball_club");
  const ping = await db.command({ ping: 1 });
  console.log("MongoDB ping:", ping.ok === 1 ? "ok" : "failed", "| db:", db.databaseName);
} catch (error) {
  console.error("MongoDB connection failed:", error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  await client.close();
}
