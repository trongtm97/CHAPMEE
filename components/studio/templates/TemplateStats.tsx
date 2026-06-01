import type { StudioTemplatesPageStats } from "@/types/templates";

type TemplateStatsProps = {
  stats: StudioTemplatesPageStats;
};

export function TemplateStats({ stats }: TemplateStatsProps) {
  const items = [
    { label: "Mẫu ChapMee", value: stats.systemCount },
    { label: "Mẫu của tôi", value: stats.mineCount },
    { label: "Yêu thích", value: stats.favoriteCount },
    { label: "Gần đây", value: stats.recentCount },
    { label: "Loại mẫu", value: stats.typeCount }
  ];

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
      {items.map((item) => (
        <div
          className="rounded-xl border border-white/10 bg-cyan-400/5 px-3 py-2.5"
          key={item.label}
        >
          <p className="text-[11px] text-zinc-500">{item.label}</p>
          <p className="text-lg font-bold tabular-nums text-white">
            {item.value.toLocaleString("vi-VN")}
          </p>
        </div>
      ))}
    </div>
  );
}
