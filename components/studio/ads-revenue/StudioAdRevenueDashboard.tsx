import { CreatorAdRevenueEstimateCard } from "@/components/studio/ads-revenue/CreatorAdRevenueEstimateCard";
import { CreatorAdRevenueHistoryTable } from "@/components/studio/ads-revenue/CreatorAdRevenueHistoryTable";
import { CreatorAdRevenuePolicyCard } from "@/components/studio/ads-revenue/CreatorAdRevenuePolicyCard";
import { CreatorAdRevenueStatusCard } from "@/components/studio/ads-revenue/CreatorAdRevenueStatusCard";
import { CreatorAdRevenueWarningCard } from "@/components/studio/ads-revenue/CreatorAdRevenueWarningCard";
import type { CreatorAdRevenueDashboard } from "@/types/creator-ad-revenue-dashboard";

type StudioAdRevenueDashboardProps = {
  dashboard: CreatorAdRevenueDashboard;
  /** Shorter intro when embedded on monetization page */
  variant?: "finance" | "monetization";
};

export function StudioAdRevenueDashboard({
  dashboard,
  variant = "finance"
}: StudioAdRevenueDashboardProps) {
  return (
    <div className="space-y-6" id="studio-ad-revenue">
      <header className="space-y-2">
        <h2 className="text-xl font-bold text-white">Doanh thu quảng cáo</h2>
        <p className="text-sm text-zinc-400">
          {variant === "finance"
            ? "Theo dõi ước tính và số liệu đã đối soát. Tách biệt với Coin và chương trả phí."
            : "Chương trình chia sẻ doanh thu quảng cáo — minh bạch, có thể thay đổi sau đối soát."}
        </p>
      </header>

      <CreatorAdRevenueWarningCard />
      <CreatorAdRevenueStatusCard dashboard={dashboard} />
      <CreatorAdRevenueEstimateCard dashboard={dashboard} />
      <CreatorAdRevenueHistoryTable dashboard={dashboard} />
      <CreatorAdRevenuePolicyCard dashboard={dashboard} />
    </div>
  );
}
