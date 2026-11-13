import { AchievementsEditor } from "@/components/admin-content-editor";
import { canEditContent, requireAdminPage } from "@/lib/auth";
import { getContentSnapshot } from "@/lib/content-db";

export default async function AdminAchievementsPage() {
  const [user, snapshot] = await Promise.all([
    requireAdminPage(),
    getContentSnapshot("achievements"),
  ]);

  return (
    <>
      <header>
        <p className="type-label text-secondary-ink">Honours</p>
        <h1 className="mt-4 type-h2">Achievements.</h1>
        <p className="mt-2 max-w-lg type-small text-muted">
          Summary stats and the honour timeline. New and edited honours appear on the public
          site as soon as you save.
        </p>
      </header>

      <div className="mt-8">
        <AchievementsEditor
          initialData={snapshot.data}
          initialRevision={snapshot.revision}
          canEdit={canEditContent(user.role)}
        />
      </div>
    </>
  );
}
