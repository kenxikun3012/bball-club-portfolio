import { ActivitiesEditor } from "@/components/admin-content-editor";
import { canEditContent, requireAdminPage } from "@/lib/auth";
import { isImageKitConfigured } from "@/lib/imagekit";
import { getContentSnapshot } from "@/lib/content-db";

export default async function AdminActivitiesPage() {
  const [user, snapshot] = await Promise.all([
    requireAdminPage(),
    getContentSnapshot("activities"),
  ]);

  return (
    <>
      <header>
        <p className="type-label text-secondary-ink">Programme</p>
        <h1 className="mt-4 type-h2">Activities.</h1>
        <p className="mt-2 max-w-lg type-small text-muted">
          The activities intro, gallery and upcoming events. Event dates use the YYYY-MM-DD
          format so the public page can order them.
        </p>
      </header>

      <div className="mt-8">
        <ActivitiesEditor
          initialData={snapshot.data}
          initialRevision={snapshot.revision}
          canEdit={canEditContent(user.role)}
          uploadsEnabled={isImageKitConfigured()}
        />
      </div>
    </>
  );
}
