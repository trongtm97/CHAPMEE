import { AdminStatCard } from "@/components/admin/AdminStatCard";
import type { MessagingRiskOverview } from "@/types/admin-messaging";

type MessagingOverviewCardsProps = {
  overview: MessagingRiskOverview;
};

export function MessagingOverviewCards({ overview }: MessagingOverviewCardsProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      <AdminStatCard label="Báo cáo đang mở" value={overview.openReports} />
      <AdminStatCard label="Tin bị chặn (24h)" value={overview.blockedMessages24h} />
      <AdminStatCard label="Yêu cầu nhắn tin hôm nay" value={overview.requestsToday} />
      <AdminStatCard label="Tài khoản bị hạn chế nhắn tin" value={overview.restrictedUsers} />
      <AdminStatCard label="Link spam bị chặn (24h)" value={overview.linkSpamBlocked24h} />
      <AdminStatCard label="Tài khoản mới cảnh báo (24h)" value={overview.newAccountAlerts24h} />
    </div>
  );
}
