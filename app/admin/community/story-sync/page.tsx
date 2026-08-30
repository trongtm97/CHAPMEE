import { StoryCommunitySyncAdminPage } from "@/components/admin/StoryCommunitySyncAdminPage";
import { ErrorState } from "@/components/ui";
import { getStoryCommunitySyncAdminPageData } from "@/lib/admin/community-sync-settings-actions";
import { getCurrentAuthContext } from "@/lib/auth/permissions";
import { requireAdminOrModerator } from "@/lib/auth/requireAdminOrModerator";

export const dynamic = "force-dynamic";

export default async function AdminStoryCommunitySyncRoute() {
  const guard = await requireAdminOrModerator("/admin/community/story-sync");

  if (!guard.ok) {
    return (
      <section className="mx-auto max-w-[960px] space-y-6">
        <h1 className="text-3xl font-bold text-white">Không có quyền truy cập</h1>
        <ErrorState message={guard.error} title="Không có quyền" variant="danger" />
      </section>
    );
  }

  const context = await getCurrentAuthContext();
  const canEdit = Boolean(context?.permissions.includes("admin.settings.update"));
  const { settings, updatedAt } = await getStoryCommunitySyncAdminPageData();

  return (
    <StoryCommunitySyncAdminPage
      canEdit={canEdit}
      settings={settings}
      updatedAt={updatedAt}
    />
  );
}
