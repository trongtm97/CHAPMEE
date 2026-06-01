import { StudioAdRevenueDashboard } from "@/components/studio/ads-revenue/StudioAdRevenueDashboard";
import { MonetizationEmptyHint } from "@/components/studio/monetization/dashboard/MonetizationEmptyHint";
import type { CreatorAdRevenueDashboard } from "@/types/creator-ad-revenue-dashboard";

type AdRevenuePanelProps = {
  dashboard: CreatorAdRevenueDashboard;
};

export function AdRevenuePanel({ dashboard }: AdRevenuePanelProps) {
  if (!dashboard.sharing.programEnabled) {
    return (
      <MonetizationEmptyHint
        description="Chương trình chia sẻ doanh thu quảng cáo chưa được bật. Khi bật, bạn sẽ thấy ước tính và số đã đối soát tại đây."
        title="Chương trình quảng cáo đang tắt"
      />
    );
  }

  return <StudioAdRevenueDashboard dashboard={dashboard} variant="monetization" />;
}
