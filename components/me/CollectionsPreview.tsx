import Link from "next/link";
import { StoryImageThumb } from "@/components/common/StoryImageView";
import { Card, EmptyState, SectionHeader } from "@/components/ui";
import type { CollectionSummary } from "@/types/collection";

type CollectionsPreviewProps = {
  items: CollectionSummary[];
  showHeader?: boolean;
};

export function CollectionsPreview({ items, showHeader = true }: CollectionsPreviewProps) {
  return (
    <section className="space-y-3">
      {showHeader ? (
        <SectionHeader
          subtitle="Tủ truyện công khai hoặc riêng tư của bạn."
          title="Tủ truyện của tôi"
        />
      ) : null}
      {items.length === 0 ? (
        <EmptyState
          description="Tạo tủ truyện đầu tiên để lưu gu đọc của bạn."
          title="Chưa có tủ truyện"
        />
      ) : (
        <div className="space-y-3">
          {items.map((collection) => (
            <Link href={`/collections/${collection.id}`} key={collection.id}>
              <Card className="space-y-3 p-4 transition hover:border-cyan-300/25 hover:bg-white/[0.05]">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-black text-white">{collection.title}</h3>
                    <p className="mt-1 text-sm leading-6 text-zinc-400">
                      {collection.description ?? "Một tủ truyện được chọn lọc theo gu của bạn."}
                    </p>
                  </div>
                  <span className="rounded-full border border-white/10 px-3 py-1 text-xs font-bold text-zinc-300">
                    {collection.visibility === "public" ? "Công khai" : "Riêng tư"}
                  </span>
                </div>
                <div className="flex gap-2">
                  {collection.previewStories.map((story) => (
                    <StoryImageThumb
                      className="relative h-14 w-10 overflow-hidden rounded-xl border border-white/10 bg-white/[0.04]"
                      key={story.id}
                      story={story}
                      usage="collectionPreview"
                    />
                  ))}
                </div>
                <p className="text-xs text-zinc-500">{collection.itemCount} truyện</p>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
