import { ChapterReactionSettingsForm } from "@/components/admin/engagement/ChapterReactionSettingsForm";
import { EngagementAdminHeader } from "@/components/admin/engagement/EngagementAdminHeader";
import { ErrorState } from "@/components/ui";
import { getAdminChapterReactionTypes } from "@/lib/admin/chapter-reaction-settings-actions";
import { requireAdminSettingsAccess } from "@/lib/auth/require-permission";

export const dynamic = "force-dynamic";

export default async function AdminChapterReactionsPage() {
  const guard = await requireAdminSettingsAccess("/admin/engagement/reactions");

  if (!guard.ok) {
    return (
      <section className="space-y-6">
        <EngagementAdminHeader title="Không có quyền truy cập" />
        <ErrorState message={guard.error} title="Từ chối truy cập" variant="danger" />
      </section>
    );
  }

  const types = await getAdminChapterReactionTypes();

  return (
    <section className="space-y-5">
      <EngagementAdminHeader
        description="Bật/tắt, đổi emoji và nhãn. Chỉ phản ứng origin=user được tính thống kê. Mọi lưu ghi audit."
        title="Cảm xúc cuối chương"
      />
      <ChapterReactionSettingsForm types={types} />
    </section>
  );
}
