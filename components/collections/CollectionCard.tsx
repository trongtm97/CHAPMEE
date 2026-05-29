import Link from "next/link";
import { StoryImageThumb } from "@/components/common/StoryImageView";
import { Card, Badge } from "@/components/ui";
import type { CollectionSummary } from "@/types/collection";

type CollectionCardProps = {
  collection: CollectionSummary;
};

export function CollectionCard({ collection }: CollectionCardProps) {
  return (
    <Link className="tap-highlight block" href={`/collections/${collection.id}`}>
      <Card className="space-y-4 overflow-hidden p-0 transition hover:-translate-y-0.5 hover:border-cyan-300/30 hover:bg-[var(--surface-soft)]">
        <div className="bg-[linear-gradient(135deg,rgba(34,211,238,0.18),rgba(17,24,39,0.18))] p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <h3 className="line-clamp-2 text-xl font-black leading-7 text-white">
                {collection.title}
              </h3>
              {collection.description ? (
                <p className="mt-2 line-clamp-2 text-sm leading-6 text-zinc-200/90">
                  {collection.description}
                </p>
              ) : null}
            </div>
            <Badge variant={collection.visibility === "public" ? "success" : "default"}>
              {collection.visibility === "public" ? "Công khai" : "Riêng tư"}
            </Badge>
          </div>
        </div>

        <div className="px-4">
          {collection.previewStories.length > 0 ? (
            collection.previewStories.map((story) => (
              <StoryImageThumb
                className="relative h-16 w-12 overflow-hidden rounded-xl border border-white/10 bg-white/[0.04]"
                key={story.id}
                story={story}
                usage="collectionPreview"
              />
            ))
          ) : (
            <div className="rounded-xl border border-dashed border-white/10 px-3 py-4 text-sm text-zinc-500">
              Chưa có truyện trong tủ
            </div>
          )}
        </div>

        <div className="px-4 pb-4">
          <div className="flex items-center justify-between text-sm text-zinc-400">
            <span>{collection.itemCount} truyện</span>
            <span>{collection.createdAt ? new Date(collection.createdAt).toLocaleDateString("vi-VN") : ""}</span>
          </div>
        </div>
      </Card>
    </Link>
  );
}
