"use client";

import Link from "next/link";
import { useTransition } from "react";
import { Button } from "@/components/ui";
import { creatorSubmitTaxonomyRevisionAction } from "@/lib/admin/content-taxonomy-quality-actions";
import type { CreatorTaxonomyRevisionItem } from "@/lib/content-taxonomy-quality/get-creator-taxonomy-revisions";

type Props = {
  items: CreatorTaxonomyRevisionItem[];
};

export function CreatorTaxonomyRevisionPanel({ items }: Props) {
  const [pending, startTransition] = useTransition();

  if (items.length === 0) return null;

  return (
    <section className="space-y-3 rounded-xl border border-amber-400/30 bg-amber-400/5 p-4">
      <h2 className="text-lg font-semibold text-amber-100">Cần chỉnh phân loại</h2>
      <p className="text-sm text-amber-100/80">
        Admin yêu cầu bạn cập nhật thể loại, tag hoặc cảnh báo nội dung. Đây là phần phân loại
        truyện — không liên quan đến nội dung block trong Composer.
      </p>
      {items.map((item) => (
        <div
          className="rounded-lg border border-white/10 bg-zinc-950/40 p-4"
          key={item.id}
        >
          <p className="font-semibold text-white">{item.storyTitle}</p>
          <p className="mt-1 text-sm text-zinc-300">{item.reason}</p>
          {item.dueAt ? (
            <p className="mt-1 text-xs text-zinc-500">Hạn: {item.dueAt}</p>
          ) : null}
          <div className="mt-3 flex flex-wrap gap-2">
            <Link
              className="inline-flex items-center rounded-lg border border-cyan-400/40 px-3 py-2 text-sm font-semibold text-cyan-200 hover:bg-cyan-400/10"
              href={item.editUrl}
            >
              Mở form chỉnh phân loại
            </Link>
            {item.status === "open" ? (
              <Button
                disabled={pending}
                onClick={() => {
                  startTransition(async () => {
                    await creatorSubmitTaxonomyRevisionAction({
                      requestId: item.id,
                      note: "Tác giả đã chỉnh phân loại theo yêu cầu."
                    });
                    window.location.reload();
                  });
                }}
              >
                Đã chỉnh xong
              </Button>
            ) : (
              <span className="text-xs text-zinc-400">Đang chờ admin duyệt lại</span>
            )}
          </div>
        </div>
      ))}
    </section>
  );
}
