import { notFound } from "next/navigation";
import { AdminContentQualityDetail } from "@/components/admin/AdminContentQualityDetail";
import { ErrorState } from "@/components/ui";
import { getContentQualityAdminDetail } from "@/lib/admin/get-content-quality-admin-detail";
import { requireModerationAccess } from "@/lib/auth/require-moderation-access";

export const dynamic = "force-dynamic";

export default async function AdminContentQualityDetailRoute({
  params
}: {
  params: Promise<{ storyId: string }>;
}) {
  const guard = await requireModerationAccess("/admin/content-quality");
  const { storyId } = await params;

  if (!guard.ok) {
    return <ErrorState message={guard.error} title="Không có quyền" variant="danger" />;
  }

  const result = await getContentQualityAdminDetail(storyId);
  if (!result.data) {
    notFound();
  }

  return (
    <section className="space-y-6">
      <AdminContentQualityDetail payload={result.data} storyId={storyId} />
    </section>
  );
}
