import { AdminContentReviewPage } from "@/components/admin/AdminContentReviewPage";
import { ErrorState } from "@/components/ui";
import { getContentReviewPageData } from "@/lib/admin/get-content-review-page-data";
import { requireAdminOrModerator } from "@/lib/auth/requireAdminOrModerator";

export const dynamic = "force-dynamic";

export default async function AdminContentPage() {
  const guard = await requireAdminOrModerator("/admin/content");

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

  const data = await getContentReviewPageData();

  return <AdminContentReviewPage data={data} />;
}
