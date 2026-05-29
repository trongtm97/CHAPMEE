import { AdminCommunityPage } from "@/components/admin/AdminCommunityPage";
import { ErrorState } from "@/components/ui";
import { getCommunityAdminPageData } from "@/lib/admin/get-community-admin-page-data";
import { getCurrentAuthContext } from "@/lib/auth/permissions";
import { requireAdminOrModerator } from "@/lib/auth/requireAdminOrModerator";

export const dynamic = "force-dynamic";

export default async function AdminCommunityRoutePage() {
  const guard = await requireAdminOrModerator("/admin/community");

  if (!guard.ok) {
    return (
      <section className="mx-auto max-w-[1320px] space-y-6">
        <h1 className="text-3xl font-bold tracking-normal text-white">
          Không có quyền truy cập
        </h1>
        <ErrorState
          message={guard.error}
          title="Không có quyền truy cập admin"
          variant="danger"
        />
      </section>
    );
  }

  const context = await getCurrentAuthContext();
  const data = await getCommunityAdminPageData(context?.permissions ?? []);

  return <AdminCommunityPage data={data} />;
}
