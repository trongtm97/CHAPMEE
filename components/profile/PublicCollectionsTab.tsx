import { PublicCollectionCard } from "@/components/library/PublicCollectionCard";
import { EmptyState } from "@/components/ui";
import type { CollectionSummary } from "@/types/collection";

type PublicCollectionsTabProps = {
  collections: CollectionSummary[];
  username: string;
  total: number;
  page: number;
};

export function PublicCollectionsTab({
  collections,
  page,
  total,
  username
}: PublicCollectionsTabProps) {
  if (!collections.length) {
    return (
      <EmptyState
        description="Người dùng này chưa công khai tủ truyện nào."
        title="Chưa có tủ công khai"
      />
    );
  }

  const hasMore = page * 20 < total;

  return (
    <div className="space-y-3">
      {collections.map((collection) => (
        <PublicCollectionCard
          collection={collection}
          key={collection.id}
          username={username}
        />
      ))}
      {hasMore ? (
        <a
          className="block text-center text-sm font-semibold text-cyan-200"
          href={`/profile/${username}?tab=collections&page=${page + 1}`}
        >
          Trang sau
        </a>
      ) : null}
    </div>
  );
}
