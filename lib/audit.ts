import { getDb } from "@/lib/mongodb";

export interface AuditEntry {
  actorEmail: string;
  action: string;
  entity: string;
  entityId?: string;
  changes?: string[];
  ipHash?: string;
  userAgent?: string;
}

/** Append-only audit trail. Never store field values (PII), only names. */
export async function logAudit(entry: AuditEntry): Promise<void> {
  try {
    const db = await getDb();
    await db.collection("audit_logs").insertOne({
      ...entry,
      changes: entry.changes ?? [],
      userAgent: (entry.userAgent ?? "").slice(0, 300),
      createdAt: new Date(),
    });
  } catch (error) {
    // Auditing must never block the action itself.
    console.error("[audit] failed to write entry", error);
  }
}
