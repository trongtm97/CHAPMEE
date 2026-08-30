import type { SupporterRankingItem } from "@/types/tip";

type ProfileTopSupportersProps = {
  items: SupporterRankingItem[];
};

export function ProfileTopSupporters({ items }: ProfileTopSupportersProps) {
  if (!items.length) {
    return null;
  }

  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-base font-bold text-white">Top người ủng hộ</h2>
      </div>
      <ul className="space-y-2 rounded-xl border border-white/10 bg-white/[0.02] p-2">
        {items.map((item, index) => (
          <li
            className="flex items-center justify-between rounded-lg px-3 py-2"
            key={`${item.user_id}-${index}`}
          >
            <div>
              <p className="text-sm font-semibold text-white">{item.display_name}</p>
              <p className="text-xs text-zinc-500">{item.tip_count} lượt ủng hộ</p>
            </div>
            <p className="text-sm font-bold text-cyan-200">{item.total_coin} coin</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
