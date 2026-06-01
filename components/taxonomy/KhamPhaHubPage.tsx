import Link from "next/link";
import {
  KHAM_PHA_HUB_SECTIONS,
  KHAM_PHA_QUICK_LINKS,
  type KhamPhaHubSectionWithStats
} from "@/lib/discovery/kham-pha-hub";
import type { KhamPhaHubSectionStats } from "@/lib/discovery/kham-pha-hub-stats";

function formatHubStats(stats: KhamPhaHubSectionStats | undefined) {
  if (!stats || stats.termCount <= 0) {
    return "Chưa có nhãn active";
  }
  const labels = `${stats.termCount} nhãn`;
  if (stats.usageTotal > 0) {
    return `${labels} · ${stats.usageTotal.toLocaleString("vi-VN")} lượt gắn truyện`;
  }
  return labels;
}

function HubCard({
  item,
  stats
}: {
  item: KhamPhaHubSectionWithStats | (typeof KHAM_PHA_QUICK_LINKS)[number];
  stats?: KhamPhaHubSectionStats;
}) {
  return (
    <Link
      className="chap-card block space-y-1.5 p-4 transition hover:border-cyan-300/30"
      href={item.href}
    >
      <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-zinc-500">
        {item.kicker}
      </p>
      <p className="text-base font-bold text-white">{item.title}</p>
      <p className="line-clamp-2 text-sm text-zinc-400">{item.description}</p>
      {stats ? (
        <p className="text-[11px] font-medium text-cyan-200/90">{formatHubStats(stats)}</p>
      ) : null}
    </Link>
  );
}

type KhamPhaHubPageProps = {
  sectionStats: Record<string, KhamPhaHubSectionStats>;
};

export function KhamPhaHubPage({ sectionStats }: KhamPhaHubPageProps) {
  const taxonomySections: KhamPhaHubSectionWithStats[] = KHAM_PHA_HUB_SECTIONS.map(
    (section) => ({
      ...section,
      termCount: sectionStats[section.href]?.termCount ?? 0,
      usageTotal: sectionStats[section.href]?.usageTotal ?? 0
    })
  );

  return (
    <section className="space-y-8">
      <header className="space-y-2">
        <p className="page-kicker">Khám phá</p>
        <h1 className="page-title">Trung tâm taxonomy đọc truyện</h1>
        <p className="page-copy max-w-2xl">
          Duyệt ChapMee theo nhãn taxonomy từ cơ sở dữ liệu — không hard-code. Mỗi nhóm có trang
          danh mục và landing truyện riêng.
        </p>
      </header>

      <div className="space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-[0.12em] text-zinc-400">Đi nhanh</h2>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {KHAM_PHA_QUICK_LINKS.map((item) => (
            <HubCard item={item} key={item.href} />
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-[0.12em] text-zinc-400">
          Nhóm taxonomy
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {taxonomySections.map((item) => (
            <HubCard item={item} key={item.href} stats={sectionStats[item.href]} />
          ))}
        </div>
      </div>

      <p className="text-xs text-zinc-500">
        Nhãn chưa có prefix SEO riêng vẫn truy cập qua đường dẫn{" "}
        <span className="text-zinc-400">/kham-pha/[loại]/[slug]</span> (fallback taxonomy).
      </p>
    </section>
  );
}
