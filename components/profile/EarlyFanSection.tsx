import Link from "next/link";
import { getStoryImageForUsage } from "@/lib/images/get-story-image";
import {
  STORY_IMAGE_PLACEHOLDER_GRADIENT_CLASS,
  getStoryPlaceholderInitial
} from "@/lib/images/placeholders";
import { EmptyState, SectionHeader } from "@/components/ui";
import { getStoryDetailHref } from "@/lib/stories/story-routes";
import type { EarlyFanStoryItem } from "@/types/early-fan";

type EarlyFanSectionProps = {
  items: EarlyFanStoryItem[];
};

export function EarlyFanSection({ items }: EarlyFanSectionProps) {
  return (
    <section className="space-y-3" id="fan-doi-dau">
      <SectionHeader
        subtitle="Những truyện bạn đã theo dõi khi chúng còn rất sớm sẽ xuất hiện ở đây."
        title="Fan đời đầu"
      />

      {items.length ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {items.map((item) => {
            const cover = getStoryImageForUsage(item, "libraryCard");

            return (
            <Link
              className="group overflow-hidden rounded-[1.35rem] border border-white/10 bg-white/[0.04] transition hover:border-cyan-300/25 hover:bg-white/[0.06]"
              href={getStoryDetailHref({
                slug: item.slug,
                public_code: item.publicCode
              })}
              key={item.id}
            >
              <div className="grid grid-cols-[4.5rem_1fr] gap-3 p-3">
                <div className="aspect-[2/3] overflow-hidden rounded-2xl bg-zinc-900">
                  {cover.src ? (
                    <div
                      aria-label={cover.alt}
                      className="h-full w-full bg-cover transition duration-500 group-hover:scale-[1.03]"
                      role="img"
                      style={{
                        backgroundImage: `url(${cover.src})`,
                        backgroundPosition: cover.objectPosition
                      }}
                    />
                  ) : (
                    <div
                      className={`flex h-full items-center justify-center text-lg font-black text-white ${STORY_IMAGE_PLACEHOLDER_GRADIENT_CLASS}`}
                    >
                      {getStoryPlaceholderInitial(item.title)}
                    </div>
                  )}
                </div>

                <div className="min-w-0 pr-1">
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-cyan-200">
                    Fan đời đầu
                  </p>
                  <h3 className="mt-1 truncate text-base font-black text-white">
                    {item.title}
                  </h3>
                  <p className="mt-1 line-clamp-2 text-sm leading-6 text-zinc-400">
                    {item.hook ?? "Đã phát hiện truyện từ rất sớm."}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className="chap-pill px-2.5 py-1 text-[11px] font-bold text-cyan-100">
                      {new Date(item.awardedAt).toLocaleDateString("vi-VN")}
                    </span>
                    <span className="chap-pill px-2.5 py-1 text-[11px] font-bold text-zinc-200">
                      {item.readsAtAward} đọc
                    </span>
                  </div>
                </div>
              </div>
            </Link>
            );
          })}
        </div>
      ) : (
        <EmptyState
          description="Theo dõi truyện mới để trở thành Fan đời đầu."
          title="Chưa có Fan đời đầu"
        />
      )}
    </section>
  );
}
