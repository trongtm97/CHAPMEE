import Link from "next/link";
import { ContinueReadingCard } from "@/components/me/ContinueReadingCard";
import { EmptyState } from "@/components/ui";
import type { ContinueReadingItem } from "@/lib/reading/getContinueReading";

type ContinueReadingSectionProps = {
  items: ContinueReadingItem[];
  variant?: "hero" | "section";
  maxItems?: number;
  title?: string;
  showHeader?: boolean;
  compact?: boolean;
};

export function ContinueReadingSection({
  compact = false,
  items,
  maxItems = 3,
  showHeader = true,
  title = "Đọc tiếp",
  variant = "section"
}: ContinueReadingSectionProps) {
  const visibleItems = items.slice(0, maxItems);
  const isHero = variant === "hero";

  if (visibleItems.length === 0) {
    if (!showHeader) {
      return null;
    }
    return (
      <section className="space-y-2">
        <h2 className="text-base font-bold text-white">{title}</h2>
        <EmptyState
          action={
            <Link
              className="inline-flex min-h-9 items-center justify-center rounded-full bg-cyan-300 px-4 text-xs font-bold text-zinc-950 transition hover:bg-cyan-200"
              href="/discover"
            >
              Khám phá truyện
            </Link>
          }
          className="py-5"
          description="Mở một chap để bắt đầu hành trình đọc."
          title="Bạn chưa đọc truyện nào."
        />
      </section>
    );
  }

  return (
    <section className="space-y-2">
      {showHeader ? (
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-base font-bold text-white">{title}</h2>
          {items.length > maxItems ? (
            <span className="text-[0.68rem] font-semibold text-zinc-500">
              +{items.length - maxItems}
            </span>
          ) : null}
        </div>
      ) : null}
      <div className="space-y-2">
        {visibleItems.map((item, index) => (
          <ContinueReadingCard
            compact={compact || isHero}
            highlight={isHero && index === 0}
            item={item}
            key={item.id}
          />
        ))}
      </div>
    </section>
  );
}

export { ContinueReadingSection as CurrentlyReadingSection };
