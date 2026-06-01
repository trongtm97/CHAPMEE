"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Card } from "@/components/ui";

export function AlgorithmAuditHub() {
  const router = useRouter();
  const [itemType, setItemType] = useState<"story" | "reel" | "author">("story");
  const [itemId, setItemId] = useState("");

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = itemId.trim();
    if (!trimmed) return;
    router.push(`/admin/algorithm/audit/${itemType}/${trimmed}`);
  }

  return (
    <Card className="space-y-4 p-5">
      <div>
        <h2 className="text-base font-bold text-white">Audit item thuật toán</h2>
        <p className="mt-1 text-sm text-zinc-400">
          Tra cứu lý do boost/giảm hiển thị cho truyện, Reels hoặc tác giả.
        </p>
      </div>

      <form className="flex flex-wrap items-end gap-3" onSubmit={handleSubmit}>
        <label className="space-y-1 text-sm">
          <span className="text-zinc-400">Loại</span>
          <select
            className="block rounded-lg border border-white/10 bg-zinc-950 px-3 py-2 text-zinc-100"
            onChange={(event) =>
              setItemType(event.target.value as "story" | "reel" | "author")
            }
            value={itemType}
          >
            <option value="story">Truyện</option>
            <option value="reel">Reels</option>
            <option value="author">Tác giả (user id)</option>
          </select>
        </label>

        <label className="min-w-[240px] flex-1 space-y-1 text-sm">
          <span className="text-zinc-400">UUID</span>
          <input
            className="w-full rounded-lg border border-white/10 bg-zinc-950 px-3 py-2 font-mono text-sm text-zinc-100"
            onChange={(event) => setItemId(event.target.value)}
            placeholder="Nhập story / reel / user id"
            value={itemId}
          />
        </label>

        <button
          className="rounded-lg bg-cyan-400 px-4 py-2 text-sm font-bold text-zinc-950 hover:bg-cyan-300"
          type="submit"
        >
          Xem audit
        </button>
      </form>

      <p className="text-xs text-zinc-500">
        Gợi ý: mở audit từ{" "}
        <Link className="text-cyan-300 hover:underline" href="/admin/content">
          Kiểm duyệt nội dung
        </Link>{" "}
        hoặc{" "}
        <Link className="text-cyan-300 hover:underline" href="/admin/algorithm/ecosystem">
          Ecosystem Fairness
        </Link>
        .
      </p>
    </Card>
  );
}
