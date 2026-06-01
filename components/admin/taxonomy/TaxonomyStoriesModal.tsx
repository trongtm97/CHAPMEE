"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { Button } from "@/components/ui";
import { listStoriesUsingTermAdminAction } from "@/lib/admin/taxonomy-actions";
import type { TaxonomyTermAdminRow } from "@/lib/taxonomy/admin-data";
import type { TaxonomyAdminNotify } from "@/lib/taxonomy/admin-ui";

type TaxonomyStoriesModalProps = {
  term: TaxonomyTermAdminRow | null;
  open: boolean;
  onClose: () => void;
  onMessage: TaxonomyAdminNotify;
};

export function TaxonomyStoriesModal({
  term,
  open,
  onClose,
  onMessage
}: TaxonomyStoriesModalProps) {
  const [pending, startTransition] = useTransition();
  const [items, setItems] = useState<
    Array<{ id: string; title: string; slug: string }>
  >([]);

  useEffect(() => {
    if (!open || !term) return;
    startTransition(async () => {
      const result = await listStoriesUsingTermAdminAction(term.id);
      if (result.error) {
        onMessage(result.error);
        setItems([]);
        return;
      }
      setItems(result.items);
    });
  }, [open, term?.id, onMessage]);

  if (!open || !term) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="flex max-h-[80vh] w-full max-w-lg flex-col overflow-hidden rounded-xl border border-zinc-700 bg-[#0c1118] shadow-2xl">
        <div className="flex items-center justify-between border-b border-zinc-800 px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold text-white">Truyện đang dùng</h2>
            <p className="text-xs text-zinc-500">
              {term.name} · {term.usage_count} truyện (hiển thị tối đa 20)
            </p>
          </div>
          <Button onClick={onClose} type="button" variant="ghost">
            Đóng
          </Button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {pending ? (
            <p className="text-sm text-zinc-500">Đang tải…</p>
          ) : items.length === 0 ? (
            <p className="text-sm text-zinc-500">Không có truyện nào.</p>
          ) : (
            <ul className="space-y-2">
              {items.map((story) => (
                <li key={story.id}>
                  <Link
                    className="text-sm text-cyan-300 hover:underline"
                    href={`/admin/content/stories/${story.id}`}
                  >
                    {story.title || story.slug}
                  </Link>
                  <span className="ml-2 font-mono text-xs text-zinc-600">{story.slug}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
