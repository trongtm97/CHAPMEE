"use client";

import Link from "next/link";
import { StoryImageThumb } from "@/components/common/StoryImageView";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { deleteCollectionFromLibraryAction } from "@/lib/library/delete-collection";
import { CreateCollectionSheet } from "@/components/library/CreateCollectionSheet";
import { LibraryEmptyState } from "@/components/library/LibraryEmptyState";
import type { CollectionSummary } from "@/types/collection";

type StoryCollectionsListProps = {
  collections: CollectionSummary[];
  searchQuery: string;
  onCreateClick?: () => void;
};

function CollectionLibraryCard({
  collection,
  onMenu
}: {
  collection: CollectionSummary;
  onMenu: (id: string, action: "rename" | "visibility" | "delete") => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <article className="rounded-xl border border-white/6 bg-white/[0.02] p-2.5">
      <div className="flex items-start justify-between gap-2">
        <Link className="min-w-0 flex-1" href={`/collections/${collection.id}`}>
          <h3 className="line-clamp-1 text-sm font-bold text-white">{collection.title}</h3>
          <p className="mt-0.5 text-[0.65rem] text-zinc-500">
            {collection.itemCount} truyện ·{" "}
            {collection.visibility === "public" ? "Công khai" : "Riêng tư"}
          </p>
        </Link>
        <div className="relative shrink-0">
          <button
            aria-label="Tùy chọn tủ"
            className="inline-flex min-h-7 min-w-7 items-center justify-center rounded-full border border-white/8 text-zinc-400"
            onClick={() => setMenuOpen((open) => !open)}
            type="button"
          >
            ⋯
          </button>
          {menuOpen ? (
            <div className="absolute right-0 top-full z-20 mt-1 min-w-[10rem] rounded-xl border border-white/10 bg-[#121820] p-1 shadow-xl">
              <Link
                className="block rounded-lg px-2.5 py-2 text-xs text-zinc-200 hover:bg-white/5"
                href={`/collections/${collection.id}/manage`}
                onClick={() => setMenuOpen(false)}
              >
                Sửa tên
              </Link>
              <Link
                className="block rounded-lg px-2.5 py-2 text-xs text-zinc-200 hover:bg-white/5"
                href={`/collections/${collection.id}/manage`}
                onClick={() => setMenuOpen(false)}
              >
                Đổi quyền riêng tư
              </Link>
              <button
                className="block w-full rounded-lg px-2.5 py-2 text-left text-xs text-red-300 hover:bg-white/5"
                onClick={() => {
                  setMenuOpen(false);
                  onMenu(collection.id, "delete");
                }}
                type="button"
              >
                Xóa tủ
              </button>
            </div>
          ) : null}
        </div>
      </div>

      <div className="mt-2 flex gap-1.5">
        {collection.previewStories.length > 0 ? (
          collection.previewStories.slice(0, 3).map((story) => (
            <StoryImageThumb
              className="h-10 w-7 overflow-hidden rounded-md border border-white/8 bg-white/5"
              key={story.id}
              story={story}
              usage="collectionPreview"
            />
          ))
        ) : (
          <div className="flex h-10 w-full items-center justify-center rounded-md border border-dashed border-white/8 text-[0.62rem] text-zinc-600">
            Chưa có truyện
          </div>
        )}
      </div>
    </article>
  );
}

export function StoryCollectionsList({
  collections,
  onCreateClick,
  searchQuery
}: StoryCollectionsListProps) {
  const router = useRouter();
  const [createOpen, setCreateOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return collections;
    return collections.filter((collection) =>
      collection.title.toLowerCase().includes(query)
    );
  }, [collections, searchQuery]);

  async function handleDelete(collectionId: string) {
    if (!window.confirm("Xóa tủ truyện này?")) {
      return;
    }
    setDeletingId(collectionId);
    try {
      await deleteCollectionFromLibraryAction(collectionId);
      router.refresh();
    } finally {
      setDeletingId(null);
    }
  }

  if (collections.length === 0) {
    return (
      <>
        <LibraryEmptyState
          action={
            <button
              className="inline-flex min-h-8 items-center justify-center rounded-full bg-cyan-300 px-3.5 text-xs font-bold text-zinc-950"
              onClick={() => {
                onCreateClick?.();
                setCreateOpen(true);
              }}
              type="button"
            >
              Tạo tủ truyện
            </button>
          }
          description="Tạo tủ để gom truyện theo gu đọc của bạn."
          title="Bạn chưa có tủ truyện."
        />
        {createOpen ? (
          <CreateCollectionSheet onClose={() => setCreateOpen(false)} />
        ) : null}
      </>
    );
  }

  return (
    <div className="space-y-2.5">
      <button
        className="w-full rounded-xl border border-cyan-300/20 bg-cyan-300/10 py-2 text-xs font-bold text-cyan-100"
        onClick={() => {
          onCreateClick?.();
          setCreateOpen(true);
        }}
        type="button"
      >
        + Tạo tủ
      </button>

      <div className="space-y-2">
        {filtered.map((collection) => (
          <CollectionLibraryCard
            collection={collection}
            key={collection.id}
            onMenu={(id, action) => {
              if (action === "delete" && deletingId !== id) {
                void handleDelete(id);
              }
            }}
          />
        ))}
      </div>

      {createOpen ? (
        <CreateCollectionSheet onClose={() => setCreateOpen(false)} />
      ) : null}
    </div>
  );
}
