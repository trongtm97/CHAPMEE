import { BoostAdminInsights } from "@/components/admin/engagement/BoostAdminInsights";
import { BoostSettingsForm } from "@/components/admin/engagement/BoostSettingsForm";
import { EngagementAdminHeader } from "@/components/admin/engagement/EngagementAdminHeader";
import { ErrorState } from "@/components/ui";
import { getAdminBoostSettingsAction } from "@/lib/admin/boost-settings-actions";
import { requireAdminSettingsAccess } from "@/lib/auth/require-permission";

export const dynamic = "force-dynamic";

export default async function AdminBoostsPage() {
  const guard = await requireAdminSettingsAccess("/admin/engagement/boosts");

  if (!guard.ok) {
    return (
      <section className="space-y-6">
        <EngagementAdminHeader title="Không có quyền truy cập" />
        <ErrorState message={guard.error} title="Từ chối truy cập" variant="danger" />
      </section>
    );
  }

  const result = await getAdminBoostSettingsAction();

  return (
    <section className="space-y-5">
      <EngagementAdminHeader
        description='Cấu hình legacy (điểm thưởng/boost cũ). Phiếu đề cử mới: /admin/engagement/recommendation-tickets.'
        title="Đề cử truyện (legacy)"
      />

      {!result.ok || !result.settings ? (
        <ErrorState message={result.error ?? "Không tải được cấu hình."} title="Lỗi" />
      ) : (
        <>
          <BoostSettingsForm settings={result.settings} />
          <BoostAdminInsights />
        </>
      )}
    </section>
  );
}
