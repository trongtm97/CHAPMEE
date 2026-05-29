"use client";

import { useEffect, useMemo, useState } from "react";
import { Button, Card, EmptyState, Input } from "@/components/ui";
import { CreateCollectionSheet } from "@/components/library/CreateCollectionSheet";
import type { CollectionSummary } from "@/types/collection";

type CollectionWithMembership = CollectionSummary & {
  containsStory?: boolean;
};

type AddToCollectionSheetProps = {
  storyId: string;
  storyTitle: string;
  onClose: () => void;
};

export function AddToCollectionSheet({ storyId, storyTitle, onClose }: AddToCollectionSheetProps) {
  const [collections, setCollections] = useState<CollectionWithMembership[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [creating, setCreating] = useState(false);
  const [createSheetOpen, setCreateSheetOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadCollections() {
    setLoading(true);
    try {
      const response = await fetch(`/api/collections?storyId=${encodeURIComponent(storyId)}`);
      const data = await response.json();
      setCollections(data.collections ?? []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadCollections();
  }, [storyId]);

  const hasCollections = useMemo(() => collections.length > 0, [collections]);

  async function addStoryToCollection(collectionId: string, selectedStoryId: string) {
    const response = await fetch(`/api/collections/${collectionId}/items`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ storyId: selectedStoryId })
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error ?? "Không thể thêm truyện vào tủ.");
    }
    await loadCollections();
  }

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-end bg-black/60 p-3 backdrop-blur-sm">
        <Card className="w-full max-h-[85vh] space-y-4 overflow-y-auto rounded-[1.5rem] p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[0.72rem] font-bold uppercase tracking-[0.18em] text-cyan-200">
                Thêm vào tủ
              </p>
              <h3 className="line-clamp-2 text-lg font-black text-white">{storyTitle}</h3>
            </div>
            <Button variant="ghost" onClick={onClose}>
              Đóng
            </Button>
          </div>

          <button
            className="w-full rounded-xl border border-cyan-300/20 bg-cyan-300/10 py-2 text-xs font-bold text-cyan-100"
            onClick={() => setCreateSheetOpen(true)}
            type="button"
          >
            Tạo tủ mới
          </button>

          {loading ? (
            <p className="text-sm text-zinc-400">Đang tải tủ truyện...</p>
          ) : hasCollections ? (
            <div className="space-y-2">
              {collections.map((collection) => {
                const alreadyAdded = Boolean(collection.containsStory);
                return (
                  <button
                    className={`flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left ${
                      alreadyAdded
                        ? "border-white/6 bg-white/[0.02] opacity-80"
                        : "border-white/10 bg-white/[0.04]"
                    }`}
                    disabled={alreadyAdded}
                    key={collection.id}
                    onClick={async () => {
                      try {
                        await addStoryToCollection(collection.id, storyId);
                      } catch (addError) {
                        setError(
                          addError instanceof Error
                            ? addError.message
                            : "Không thể thêm truyện."
                        );
                      }
                    }}
                    type="button"
                  >
                    <div className="min-w-0 pr-2">
                      <p className="truncate font-bold text-white">{collection.title}</p>
                      <p className="text-xs text-zinc-400">
                        {collection.itemCount} truyện ·{" "}
                        {collection.visibility === "public" ? "Công khai" : "Riêng tư"}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 text-sm font-black ${
                        alreadyAdded ? "text-zinc-500" : "text-cyan-200"
                      }`}
                    >
                      {alreadyAdded ? "Đã thêm" : "Thêm"}
                    </span>
                  </button>
                );
              })}
            </div>
          ) : (
            <EmptyState
              description="Tạo tủ đầu tiên để bắt đầu lưu gu đọc của bạn."
              title="Chưa có tủ truyện"
            />
          )}

          <div className="space-y-3 rounded-3xl border border-white/10 bg-white/[0.03] p-4">
            <p className="text-sm font-bold text-white">Tạo tủ mới nhanh</p>
            <Input
              label="Tên tủ"
              maxLength={60}
              name="collection_title"
              onChange={(event) => setNewTitle(event.target.value)}
              placeholder="Truyện kinh dị đêm khuya"
              value={newTitle}
            />
            <Input
              label="Mô tả"
              name="collection_description"
              onChange={(event) => setNewDescription(event.target.value)}
              placeholder="Danh sách dành cho mood này"
              value={newDescription}
            />
            {error ? <p className="text-xs text-red-300">{error}</p> : null}
            <Button
              loading={creating}
              onClick={async () => {
                const trimmed = newTitle.trim();
                if (!trimmed) {
                  setError("Vui lòng nhập tên tủ.");
                  return;
                }
                if (trimmed.length > 60) {
                  setError("Tên tủ tối đa 60 ký tự.");
                  return;
                }
                setCreating(true);
                setError(null);
                try {
                  const response = await fetch("/api/collections", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      title: trimmed,
                      description: newDescription,
                      visibility: "private"
                    })
                  });
                  const data = await response.json();
                  if (!response.ok) {
                    throw new Error(data.error ?? "Không thể tạo tủ truyện.");
                  }
                  await fetch(`/api/collections/${data.id}/items`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ storyId })
                  });
                  onClose();
                } catch (createError) {
                  setError(
                    createError instanceof Error
                      ? createError.message
                      : "Không thể tạo tủ truyện."
                  );
                } finally {
                  setCreating(false);
                }
              }}
              type="button"
            >
              Tạo và thêm
            </Button>
          </div>
        </Card>
      </div>

      {createSheetOpen ? (
        <CreateCollectionSheet
          onClose={() => {
            setCreateSheetOpen(false);
            void loadCollections();
          }}
          onCreated={async (collectionId) => {
            await addStoryToCollection(collectionId, storyId);
            onClose();
          }}
        />
      ) : null}
    </>
  );
}
