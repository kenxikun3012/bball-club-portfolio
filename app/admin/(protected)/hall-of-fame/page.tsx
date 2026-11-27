import { HallOfFameEditor } from "@/components/admin-content-editor";
import { canEditContent, requireAdminPage } from "@/lib/auth";
import { isImageKitConfigured } from "@/lib/imagekit";
import { getContentSnapshot } from "@/lib/content-db";

export default async function AdminHallOfFamePage() {
  const [user, snapshot] = await Promise.all([
    requireAdminPage(),
    getContentSnapshot("hallOfFame"),
  ]);

  return (
    <>
      <header>
        <p className="type-label text-secondary-ink">Legacy</p>
        <h1 className="mt-4 type-h2">Hall of Fame.</h1>
        <p className="mt-2 max-w-lg type-small text-muted">
          Retired jerseys and inductees. Jersey numbers can only be retired once, and saving
          updates the public carousel immediately.
        </p>
      </header>

      <div className="mt-8">
        <HallOfFameEditor
          initialData={snapshot.data}
          initialRevision={snapshot.revision}
          canEdit={canEditContent(user.role)}
          uploadsEnabled={isImageKitConfigured()}
        />
      </div>
    </>
  );
}
