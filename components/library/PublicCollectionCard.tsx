import Link from "next/link";
import { StoryImageThumb } from "@/components/common/StoryImageView";
import { Badge } from "@/components/ui";
import type { CollectionSummary } from "@/types/collection";

type PublicCollectionCardProps = {
  collection: CollectionSummary;
  username: string;
};

export function PublicCollectionCard({ collection, username }: PublicCollectionCardProps) {
  return (
    <Link
      className="block rounded-xl border border-white/6 bg-white/[0.02] p-3 transition hover:border-cyan-300/20 hover:bg-white/[0.04]"
      href={`/profile/${username}/collections/${collection.id}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h3 className="line-clamp-1 text-sm font-bold text-white">{collection.title}</h3>
          {collection.description ? (
            <p className="mt-1 line-clamp-2 text-xs leading-5 text-zinc-400">
              {collection.description}
            </p>
          ) : null}
          <p className="mt-1 text-[0.65rem] text-zinc-500">{collection.itemCount} truyện</p>
        </div>
        <Badge variant="success">Công khai</Badge>
      </div>
      <div className="mt-2 flex gap-1.5">
        {collection.previewStories.length > 0 ? (
          collection.previewStories.slice(0, 3).map((story) => (
            <StoryImageThumb
              className="h-10 w-7 overflow-hidden rounded-md border border-white/8 bg-white/5"
              key={story.storyId}
              story={{ title: story.title, coverUrl: story.coverUrl }}
              usage="collectionPreview"
            />
          ))
        ) : (
          <p className="text-xs text-zinc-600">Chưa có truyện trong tủ</p>
        )}
      </div>
    </Link>
  );
}
