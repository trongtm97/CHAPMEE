import Link from "next/link";
import type { PersonalActivityItem } from "@/types/me-page";

export type ActivityFilter = "all" | "comment" | "save" | "follow" | "group";

type PersonalActivityTimelineProps = {
  items: PersonalActivityItem[];
  maxItems?: number;
  title?: string;
  viewAllHref?: string;
  filter?: ActivityFilter;
  showHeader?: boolean;
  variant?: "compact" | "full";
};

const iconByType: Record<PersonalActivityItem["type"], string> = {
  comment: "💬",
  save: "🔖",
  follow: "👤",
  badge: "🏅",
  milestone: "🎯",
  top_fan: "⭐",
  thank_you: "💌"
};

function formatRelativeTime(value: string) {
  const diffMs = Date.now() - new Date(value).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "Vừa xong";
  if (minutes < 60) return `${minutes}p`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}g`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}n`;
  return new Date(value).toLocaleDateString("vi-VN", { day: "numeric", month: "numeric" });
}

function matchesFilter(item: PersonalActivityItem, filter: ActivityFilter) {
  if (filter === "all") return true;
  if (filter === "comment") return item.type === "comment";
  if (filter === "save") return item.type === "save";
  if (filter === "follow") return item.type === "follow";
  if (filter === "group") return item.type === "top_fan" || item.type === "thank_you";
  return true;
}

export function PersonalActivityTimeline({
  filter = "all",
  items,
  maxItems,
  showHeader = true,
  title = "Hoạt động gần đây",
  variant = "compact",
  viewAllHref
}: PersonalActivityTimelineProps) {
  const filtered = items.filter((item) => matchesFilter(item, filter));
  const visibleItems = maxItems != null ? filtered.slice(0, maxItems) : filtered;

  if (visibleItems.length === 0) {
    return null;
  }

  return (
    <section className="space-y-1.5">
      {showHeader ? (
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-base font-bold text-white">{title}</h2>
          {viewAllHref ? (
            <Link
              className="text-[0.68rem] font-semibold text-cyan-200"
              href={viewAllHref}
            >
              Xem tất cả
            </Link>
          ) : null}
        </div>
      ) : null}
      <div className="overflow-hidden rounded-[0.9rem] border border-white/5 bg-white/[0.015]">
        {visibleItems.map((item, index) => {
          const row = (
            <div
              className={`flex items-start gap-2 ${
                variant === "compact" ? "px-3 py-2" : "px-3.5 py-2.5"
              } ${index > 0 ? "border-t border-white/[0.04]" : ""}`}
            >
              <span aria-hidden="true" className="mt-0.5 text-xs opacity-70">
                {iconByType[item.type]}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[0.8125rem] leading-5 text-zinc-400">{item.message}</p>
              </div>
              <span className="shrink-0 text-[0.625rem] text-zinc-600">
                {formatRelativeTime(item.createdAt)}
              </span>
            </div>
          );

          if (item.href) {
            return (
              <Link className="block transition hover:bg-white/[0.02]" href={item.href} key={item.id}>
                {row}
              </Link>
            );
          }

          return (
            <div key={item.id}>
              {row}
            </div>
          );
        })}
      </div>
    </section>
  );
}
