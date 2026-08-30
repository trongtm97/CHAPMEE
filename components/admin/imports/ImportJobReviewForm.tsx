"use client";

import Link from "next/link";
import { useRef } from "react";
import type { ImportItemRow } from "@/types/import-pipeline";
import {
  publishSelectedImportItemsFormAction,
  skipSelectedImportItemsFormAction
} from "@/lib/admin/import-pipeline-actions";

type ImportJobReviewFormProps = {
  jobId: string;
  items: ImportItemRow[];
  ownerProfileId: string | null;
};

function canSelect(item: ImportItemRow) {
  return item.status !== "published" && item.status !== "duplicate";
}

export function ImportJobReviewForm({
  jobId,
  items,
  ownerProfileId
}: ImportJobReviewFormProps) {
  const formRef = useRef<HTMLFormElement>(null);

  function selectAllReady() {
    const form = formRef.current;
    if (!form) return;
    const boxes = form.querySelectorAll<HTMLInputElement>('input[name="item_id"]');
    for (const box of boxes) {
      if (box.disabled) continue;
      const row = items.find((item) => item.id === box.value);
      box.checked = row?.status === "ready" || row?.status === "parsed";
    }
  }

  return (
    <form ref={formRef} className="space-y-4 rounded-xl border border-white/10 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-semibold text-white">Review & publish</h2>
        <button
          className="text-xs text-cyan-300 underline"
          onClick={selectAllReady}
          type="button"
        >
          Chọn tất cả ready
        </button>
      </div>

      {!ownerProfileId ? (
        <label className="block text-sm text-amber-200">
          Owner profile ID (bắt buộc trước publish)
          <input
            className="mt-1 w-full rounded border border-white/10 bg-black/30 px-2 py-1 text-white"
            name="owner_profile_id"
            type="text"
          />
        </label>
      ) : (
        <p className="text-xs text-slate-400">Owner: {ownerProfileId}</p>
      )}

      <label className="flex items-center gap-2 text-sm text-slate-300">
        <input name="make_public" type="checkbox" />
        Public visibility (mặc định: private draft)
      </label>

      <ul className="max-h-[28rem] space-y-2 overflow-y-auto text-sm">
        {items.map((item) => (
          <li
            key={item.id}
            className="flex flex-wrap items-start gap-2 rounded border border-white/5 p-2"
          >
            <input
              defaultChecked={item.status === "ready"}
              disabled={!canSelect(item)}
              name="item_id"
              type="checkbox"
              value={item.id}
            />
            <div className="min-w-0 flex-1">
              <span className="font-medium text-white">
                [{item.item_type}] {item.chapter_title ?? item.title}
                {item.chapter_number != null ? ` #${item.chapter_number}` : ""}
              </span>
              <p className="text-xs text-slate-400">
                {item.status}
                {item.content_hash ? ` · hash ${item.content_hash.slice(0, 8)}…` : ""}
              </p>
              {item.raw_text_preview ? (
                <p className="mt-1 line-clamp-2 text-xs text-slate-500">{item.raw_text_preview}</p>
              ) : null}
              {item.error_message ? (
                <p className="text-xs text-red-300">{item.error_message}</p>
              ) : null}
              {item.target_story_id ? (
                <p className="mt-1 text-xs">
                  <Link
                    className="text-cyan-300 underline"
                    href={`/studio/stories/${item.target_story_id}/chapters`}
                  >
                    Mở Studio story →
                  </Link>
                  {item.target_chapter_id ? (
                    <span className="text-slate-500"> · ch {item.target_chapter_id.slice(0, 8)}…</span>
                  ) : null}
                </p>
              ) : null}
            </div>
          </li>
        ))}
      </ul>

      <div className="flex flex-wrap gap-2">
        <button
          className="rounded bg-emerald-700 px-4 py-2 text-sm font-semibold text-white"
          formAction={publishSelectedImportItemsFormAction.bind(null, jobId)}
          type="submit"
        >
          Publish selected
        </button>
        <button
          className="rounded border border-white/20 px-4 py-2 text-sm text-slate-200"
          formAction={skipSelectedImportItemsFormAction.bind(null, jobId)}
          type="submit"
        >
          Skip selected
        </button>
      </div>
      <p className="text-xs text-slate-500">
        Chỉ publish chapter vẫn tạo story tự động nếu story item ready và chưa chọn.
      </p>
    </form>
  );
}
