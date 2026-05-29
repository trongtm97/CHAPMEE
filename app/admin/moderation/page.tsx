import Link from "next/link";
import { ModerationDashboard } from "@/components/moderation/ModerationDashboard";
import { SpamReportersAlert } from "@/components/moderation/SpamReportersAlert";
import { getSpamSuspectedReporters } from "@/lib/moderation/get-spam-reporters";
import { ErrorState } from "@/components/ui";
import { requireAnyPermission } from "@/lib/auth/require-permission";
import {
  getModerationAppeals,
  getModerationReports
} from "@/lib/moderation/get-moderation-queue";

export const dynamic = "force-dynamic";

export default async function AdminModerationPage() {
  const guard = await requireAnyPermission(
    ["report.review", "moderation.action.create"],
    { returnTo: "/admin/moderation" }
  );

  if (!guard.ok) {
    return (
      <ErrorState message={guard.error} title="Không có quyền truy cập" />
    );
  }

  const [pending, reviewing, resolved, allReports, appeals, spamReporters] =
    await Promise.all([
      getModerationReports("pending"),
      getModerationReports("reviewing"),
      getModerationReports("resolved_action_taken"),
      getModerationReports("all"),
      getModerationAppeals(),
      getSpamSuspectedReporters()
    ]);

  const copyrightReports = allReports.filter(
    (r) => r.reasonCode === "copyright" && ["pending", "reviewing"].includes(r.status)
  );

  const resolvedMerged = [
    ...resolved,
    ...allReports.filter((r) =>
      ["resolved_no_violation", "rejected_abuse", "resolved"].includes(r.status)
    )
  ];

  return (
    <div className="space-y-6">
      <section className="space-y-2">
        <p className="page-kicker">Kiểm duyệt</p>
        <h1 className="page-title">Hàng chờ moderation</h1>
        <p className="text-sm text-zinc-400">
          Xử lý báo cáo, vi phạm, strike và khiếu nại. Mọi hành động được ghi audit log.
        </p>
        <div className="flex flex-wrap gap-4">
          <Link className="text-sm text-cyan-300 hover:text-cyan-200" href="/admin/messaging">
            Báo cáo tin nhắn
          </Link>
          <Link className="text-sm text-cyan-300 hover:text-cyan-200" href="/admin/audit">
            Xem nhật ký audit
          </Link>
        </div>
      </section>

      <SpamReportersAlert reporters={spamReporters} />

      <ModerationDashboard
        appeals={appeals}
        copyrightReports={copyrightReports}
        pendingReports={pending}
        resolvedReports={resolvedMerged}
        reviewingReports={reviewing}
      />
    </div>
  );
}
