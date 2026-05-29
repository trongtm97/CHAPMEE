import Link from "next/link";
import { Badge } from "@/components/ui";
import type { AchievementPreviewItem } from "@/types/me-page";

type AchievementPreviewProps = {
  items: AchievementPreviewItem[];
  maxItems?: number;
  onViewAllHref?: string;
};

export function AchievementPreview({
  items,
  maxItems = 2,
  onViewAllHref = "/me?tab=achievements"
}: AchievementPreviewProps) {
  const visibleItems = items.slice(0, maxItems);

  if (visibleItems.length === 0) {
    return null;
  }

  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-bold text-white">Thành tích gần mở khóa</h2>
        <Link
          className="text-[0.68rem] font-semibold text-cyan-200"
          href={onViewAllHref}
        >
          Xem tất cả
        </Link>
      </div>
      <div className="space-y-2">
        {visibleItems.map((item) => (
          <div
            className="rounded-[1rem] border border-white/8 bg-white/[0.02] px-3 py-2.5"
            key={item.id}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <h3 className="text-sm font-semibold text-white">{item.title}</h3>
                <p className="mt-0.5 line-clamp-1 text-xs text-zinc-500">{item.description}</p>
              </div>
              <Badge variant={item.status === "unlocked" ? "success" : "warning"}>
                {item.status === "unlocked" ? "Đã mở" : "Gần mở"}
              </Badge>
            </div>
            {item.progress && item.progress.target > 0 ? (
              <div className="mt-2">
                <div className="h-1 overflow-hidden rounded-full bg-zinc-800">
                  <div
                    className="h-full rounded-full bg-cyan-300"
                    style={{
                      width: `${Math.min(100, (item.progress.current / item.progress.target) * 100)}%`
                    }}
                  />
                </div>
                <p className="mt-1 text-[0.65rem] text-zinc-600">
                  {item.progress.current}/{item.progress.target}
                </p>
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </section>
  );
}
