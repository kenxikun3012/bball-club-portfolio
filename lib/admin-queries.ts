import { getDb } from "@/lib/mongodb";

export interface ApplicationRow {
  _id: unknown;
  name: string;
  email: string;
  phone: string;
  position: string;
  year: string;
  message?: string;
  status?: string;
  createdAt: Date;
}

export interface AuditRow {
  _id: unknown;
  actorEmail: string;
  action: string;
  entity: string;
  entityId?: string;
  createdAt: Date;
}

export async function getApplicationStats(): Promise<{ total: number; pending: number }> {
  try {
    const db = await getDb();
    const applications = db.collection("applications");
    const [total, pending] = await Promise.all([
      applications.countDocuments(),
      applications.countDocuments({ status: "new" }),
    ]);
    return { total, pending };
  } catch (error) {
    console.error("[admin] application stats failed", error);
    return { total: 0, pending: 0 };
  }
}

export async function getApplications(limit = 50): Promise<ApplicationRow[]> {
  try {
    const db = await getDb();
    return (await db
      .collection("applications")
      .find({})
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray()) as unknown as ApplicationRow[];
  } catch (error) {
    console.error("[admin] applications query failed", error);
    return [];
  }
}

export async function getRecentAudit(limit = 6): Promise<AuditRow[]> {
  try {
    const db = await getDb();
    return (await db
      .collection("audit_logs")
      .find({})
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray()) as unknown as AuditRow[];
  } catch (error) {
    console.error("[admin] audit query failed", error);
    return [];
  }
}

export function formatAdminDate(value: Date | string | undefined): string {
  if (!value) return "—";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
