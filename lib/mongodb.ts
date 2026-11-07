import { MongoClient, type Db } from "mongodb";
import { mongoDbName, requireEnv } from "@/lib/env";

/**
 * Cached MongoDB connection.
 *
 * Serverless runtimes re-use warm instances, so the client is kept on
 * `globalThis` to survive hot reloads and route re-imports. Indexes are created
 * once per process (promise cached) instead of per request.
 */
const globalForMongo = globalThis as typeof globalThis & {
  __mongoClient?: MongoClient;
  __mongoIndexes?: Promise<void>;
};

export async function getDb(): Promise<Db> {
  const uri = requireEnv("MONGODB_URI");

  if (!globalForMongo.__mongoClient) {
    globalForMongo.__mongoClient = new MongoClient(uri, {
      maxPoolSize: 10,
      minPoolSize: 0,
      serverSelectionTimeoutMS: 6_000,
      connectTimeoutMS: 6_000,
      appName: "ubc-portfolio",
    });
  }

  const client = globalForMongo.__mongoClient;
  await client.connect();
  const db = client.db(mongoDbName());

  if (!globalForMongo.__mongoIndexes) {
    globalForMongo.__mongoIndexes = ensureIndexes(db).catch((error) => {
      // Allow a later request to retry index creation.
      globalForMongo.__mongoIndexes = undefined;
      throw error;
    });
  }
  await globalForMongo.__mongoIndexes;

  return db;
}

async function ensureIndexes(db: Db): Promise<void> {
  await db.collection("applications").createIndexes([
    { key: { email: 1, createdAt: -1 }, name: "email_created" },
    { key: { ipHash: 1, createdAt: -1 }, name: "ip_created" },
    { key: { createdAt: -1 }, name: "created" },
  ]);

  // Rolling-window counters; expired documents are removed by the TTL index.
  await db.collection("join_rate_limits").createIndex(
    { expiresAt: 1 },
    { name: "expires_ttl", expireAfterSeconds: 0 },
  );
}
