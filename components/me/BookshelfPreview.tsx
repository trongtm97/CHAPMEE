import Link from "next/link";
import { ChapMeeStoryCover } from "@/components/common/ChapMeeCover";
import { Card, EmptyState, SectionHeader } from "@/components/ui";
import { getStoryDetailHref } from "@/lib/stories/story-routes";
import type { ProfileStoryItem } from "@/types/profile";

type BookshelfPreviewProps = {
  title: string;
  description: string;
  items?: ProfileStoryItem[];
  emptyTitle?: string;
  emptyDescription?: string;
  showHeader?: boolean;
};

export function BookshelfPreview({
  description,
  emptyDescription,
  emptyTitle,
  items = [],
  showHeader = true,
  title
}: BookshelfPreviewProps) {
  return (
    <section className="space-y-3">
      {showHeader && title ? <SectionHeader title={title} /> : null}
      {items.length === 0 ? (
        <EmptyState
          className="py-6"
          description={emptyDescription ?? description}
          title={emptyTitle ?? "Chưa có dữ liệu"}
        />
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <Link
              href={getStoryDetailHref({
                slug: item.slug,
                public_code: item.publicCode
              })}
              key={item.id}
            >
              <Card className="p-3 transition hover:border-cyan-300/25 hover:bg-white/[0.05]">
                <div className="flex gap-3">
                  <ChapMeeStoryCover
                    className="rounded-[1rem]"
                    size="sm"
                    story={item}
                    usage="libraryCard"
                  />
                  <div className="min-w-0 py-1">
                    <p className="text-[0.7rem] font-bold uppercase tracking-[0.18em] text-cyan-200">
                      {item.meta ?? "ChapMee"}
                    </p>
                    <h3 className="mt-2 line-clamp-2 text-base font-bold leading-6 text-white">
                      {item.title}
                    </h3>
                    {item.subtitle ? (
                      <p className="mt-2 line-clamp-2 text-sm leading-6 text-zinc-400">
                        {item.subtitle}
                      </p>
                    ) : null}
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
