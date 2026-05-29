import { CommunityAutoModerationPage } from "@/components/admin/CommunityAutoModerationPage";
import { ErrorState } from "@/components/ui";
import { getAutoModerationPageData } from "@/lib/admin/get-auto-moderation-page-data";
import { getCurrentAuthContext } from "@/lib/auth/permissions";
import { requireAdminOrModerator } from "@/lib/auth/requireAdminOrModerator";

export const dynamic = "force-dynamic";

export default async function AdminCommunityAutoModerationRoute() {
  const guard = await requireAdminOrModerator("/admin/community/auto-moderation");

  if (!guard.ok) {
    return (
      <section className="mx-auto max-w-[1320px] space-y-6">
        <h1 className="text-3xl font-bold text-white">Không có quyền truy cập</h1>
        <ErrorState message={guard.error} title="Không có quyền" variant="danger" />
      </section>
    );
  }

  const context = await getCurrentAuthContext();
  const canEdit = Boolean(
    context?.permissions.includes("admin.settings.update")
  );
  const data = await getAutoModerationPageData();

  return <CommunityAutoModerationPage canEdit={canEdit} data={data} />;
}
