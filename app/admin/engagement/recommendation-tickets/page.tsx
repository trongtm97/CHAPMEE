import Link from "next/link";
import { RecommendationTicketsAdminPanel } from "@/components/admin/engagement/RecommendationTicketsAdminPanel";
import { EngagementAdminHeader } from "@/components/admin/engagement/EngagementAdminHeader";
import { ErrorState } from "@/components/ui";
import { getAdminRecommendationTicketsOverviewAction } from "@/lib/admin/recommendation-ticket-actions";
import { requireAdminSettingsAccess } from "@/lib/auth/require-permission";

export const dynamic = "force-dynamic";

export default async function AdminRecommendationTicketsPage() {
  const guard = await requireAdminSettingsAccess("/admin/engagement/recommendation-tickets");

  if (!guard.ok) {
    return (
      <section className="space-y-6">
        <EngagementAdminHeader title="Không có quyền truy cập" />
        <ErrorState message={guard.error} title="Từ chối truy cập" variant="danger" />
      </section>
    );
  }

  const overview = await getAdminRecommendationTicketsOverviewAction();

  return (
    <section className="space-y-5">
      <EngagementAdminHeader
        description="Cấp Phiếu đề cử cho độc giả, xem cấu hình nguồn nhận phiếu và lịch sử cấp admin."
        title="Phiếu đề cử"
      />
      <p className="text-sm text-zinc-500">
        <Link className="font-semibold text-cyan-300 hover:underline" href="/admin/engagement">
          ← Engagement
        </Link>
        <span className="mx-2 text-zinc-600">·</span>
        <Link className="font-semibold text-zinc-400 hover:text-zinc-200" href="/admin/engagement/boosts">
          Cấu hình đề cử (legacy)
        </Link>
      </p>

      {!overview.ok || !overview.config ? (
        <ErrorState message={overview.error ?? "Không tải được dữ liệu."} title="Lỗi" />
      ) : (
        <RecommendationTicketsAdminPanel
          config={overview.config}
          recentGrants={overview.recentGrants}
        />
      )}
    </section>
  );
}
