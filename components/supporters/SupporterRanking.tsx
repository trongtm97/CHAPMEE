import { Card, SectionHeader } from "@/components/ui";
import type { SupporterRankingItem } from "@/types/tip";

type SupporterRankingProps = {
  title: string;
  subtitle?: string;
  items: SupporterRankingItem[];
};

export function SupporterRanking({ title, subtitle, items }: SupporterRankingProps) {
  return (
    <section className="space-y-3">
      <SectionHeader subtitle={subtitle} title={title} />
      <Card className="space-y-2">
        {items.length === 0 ? (
          <p className="text-sm text-zinc-400">Chưa có dữ liệu người ủng hộ.</p>
        ) : (
          items.map((item, index) => (
            <div
              className="flex items-center justify-between rounded-xl border border-white/10 px-3 py-2"
              key={`${item.user_id}-${index}`}
            >
              <div>
                <p className="font-semibold text-white">
                  {item.display_name}
                  {index === 0 ? " • Fan Vàng" : ""}
                </p>
                <p className="text-xs text-zinc-400">
                  {item.tip_count} lượt ủng hộ
                </p>
              </div>
              <p className="text-sm font-black text-cyan-200">{item.total_coin} coin</p>
            </div>
          ))
        )}
      </Card>
    </section>
  );
}
