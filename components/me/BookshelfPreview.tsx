import Link from "next/link";
import { getStoryImageForUsage } from "@/lib/images/get-story-image";
import {
  STORY_IMAGE_PLACEHOLDER_GRADIENT_CLASS,
  getStoryPlaceholderInitial
} from "@/lib/images/placeholders";
import { Card, EmptyState, SectionHeader } from "@/components/ui";
import { getStoryDetailHref } from "@/lib/stories/story-routes";
import type { ProfileStoryItem } from "@/types/profile";

type BookshelfPreviewProps = {
  title: string;
  description: string;
  items?: ProfileStoryItem[];
  emptyTitle?: string;
  emptyDescription?: string;
};

export function BookshelfPreview({
  description,
  emptyDescription,
  emptyTitle,
  items = [],
  title
}: BookshelfPreviewProps) {
  return (
    <section className="space-y-3">
      <SectionHeader title={title} />
      {items.length === 0 ? (
        <EmptyState
          className="py-6"
          description={emptyDescription ?? description}
          title={emptyTitle ?? "Chưa có dữ liệu"}
        />
      ) : (
        <div className="space-y-3">
          {items.map((item) => {
            const cover = getStoryImageForUsage(item, "libraryCard");

            return (
            <Link
              href={getStoryDetailHref({
                slug: item.slug,
                public_code: item.publicCode
              })}
              key={item.id}
            >
              <Card className="p-3 transition hover:border-cyan-300/25 hover:bg-white/[0.05]">
                <div className="grid grid-cols-[4.5rem_1fr] gap-3">
                  <div className="relative aspect-[2/3] overflow-hidden rounded-[1rem] border border-white/10 bg-[linear-gradient(135deg,rgba(103,232,249,0.18),rgba(17,24,39,0.95))]">
                    {cover.src ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        alt={cover.alt}
                        className="absolute inset-0 h-full w-full object-cover"
                        src={cover.src}
                        style={{ objectPosition: cover.objectPosition }}
                      />
                    ) : (
                      <span
                        className={`flex h-full items-center justify-center text-lg font-black text-white/85 ${STORY_IMAGE_PLACEHOLDER_GRADIENT_CLASS}`}
                      >
                        {getStoryPlaceholderInitial(item.title)}
                      </span>
                    )}
                  </div>
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
            );
          })}
        </div>
      )}
    </section>
  );
}
