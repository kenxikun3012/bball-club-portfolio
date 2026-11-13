import { MembersEditor } from "@/components/admin-content-editor";
import { canEditContent, requireAdminPage } from "@/lib/auth";
import { isImageKitConfigured } from "@/lib/imagekit";
import { getContentSnapshot } from "@/lib/content-db";

export default async function AdminMembersPage() {
  const [user, snapshot] = await Promise.all([
    requireAdminPage(),
    getContentSnapshot("members"),
  ]);

  return (
    <>
      <header>
        <p className="type-label text-secondary-ink">Roster</p>
        <h1 className="mt-4 type-h2">Members.</h1>
        <p className="mt-2 max-w-lg type-small text-muted">
          Create, edit and reorder players and staff. Saving publishes straight to the public
          site. Jersey numbers must be unique inside a roster.
        </p>
      </header>

      <div className="mt-8">
        <MembersEditor
          initialData={snapshot.data}
          initialRevision={snapshot.revision}
          canEdit={canEditContent(user.role)}
          uploadsEnabled={isImageKitConfigured()}
        />
      </div>
    </>
  );
}
