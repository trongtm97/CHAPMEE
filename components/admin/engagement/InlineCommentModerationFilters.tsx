"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui";

export function InlineCommentModerationFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const status = searchParams.get("status") ?? "";
  const orphaned = searchParams.get("orphaned") ?? "";
  const reported = searchParams.get("reported") ?? "";
  const q = searchParams.get("q") ?? "";

  function pushUpdates(updates: Record<string, string>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
    }
    params.delete("page");
    router.push(`/admin/engagement/inline-comments?${params.toString()}`);
  }

  return (
    <div className="space-y-3 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4">
      <div className="flex flex-wrap gap-2">
        {[
          { value: "", label: "Tất cả" },
          { value: "visible", label: "Hiện" },
          { value: "hidden", label: "Ẩn" }
        ].map((tab) => (
          <button
            className={`rounded-full px-3 py-1.5 text-sm font-semibold ${
              status === tab.value
                ? "bg-cyan-300 text-zinc-950"
                : "border border-white/10 text-zinc-300 hover:bg-white/[0.04]"
            }`}
            key={tab.value || "all"}
            onClick={() => pushUpdates({ status: tab.value })}
            type="button"
          >
            {tab.label}
          </button>
        ))}
        <button
          className={`rounded-full px-3 py-1.5 text-sm font-semibold ${
            reported === "1" ? "bg-amber-400/20 text-amber-200" : "border border-white/10 text-zinc-300"
          }`}
          onClick={() => pushUpdates({ reported: reported === "1" ? "" : "1" })}
          type="button"
        >
          Có báo cáo
        </button>
        <button
          className={`rounded-full px-3 py-1.5 text-sm font-semibold ${
            orphaned === "1" ? "bg-rose-400/20 text-rose-200" : "border border-white/10 text-zinc-300"
          }`}
          onClick={() => pushUpdates({ orphaned: orphaned === "1" ? "" : "1" })}
          type="button"
        >
          Mồ côi
        </button>
      </div>
      <Input
        placeholder="Tìm truyện / chương / số chương"
        value={q}
        onChange={(e) => pushUpdates({ q: e.target.value })}
      />
    </div>
  );
}
