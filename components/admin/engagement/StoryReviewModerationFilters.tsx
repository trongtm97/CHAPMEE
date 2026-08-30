"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui";

type StoryReviewModerationFiltersProps = {
  basePath?: string;
};

export function StoryReviewModerationFilters({
  basePath = "/admin/engagement/reviews"
}: StoryReviewModerationFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const status = searchParams.get("status") ?? "";
  const reported = searchParams.get("reported") ?? "";
  const rating = searchParams.get("rating") ?? "";
  const storyQ = searchParams.get("storyQ") ?? "";
  const userQ = searchParams.get("userQ") ?? "";

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
    router.push(`${basePath}?${params.toString()}`);
  }

  return (
    <div className="space-y-3 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4">
      <div className="flex flex-wrap gap-2">
        {[
          { value: "", label: "Tất cả" },
          { value: "visible", label: "Hiện" },
          { value: "hidden", label: "Ẩn" },
          { value: "pending", label: "Chờ duyệt" }
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
            reported === "1"
              ? "bg-amber-400/20 text-amber-200"
              : "border border-white/10 text-zinc-300"
          }`}
          onClick={() => pushUpdates({ reported: reported === "1" ? "" : "1" })}
          type="button"
        >
          Có báo cáo
        </button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <select
          className="rounded-lg border border-white/[0.08] bg-[#0b1016] px-3 py-2 text-sm text-white"
          onChange={(e) => pushUpdates({ rating: e.target.value })}
          value={rating}
        >
          <option value="">Mọi sao</option>
          {[5, 4, 3, 2, 1].map((n) => (
            <option key={n} value={String(n)}>
              {n} sao
            </option>
          ))}
        </select>
        <Input
          placeholder="Tìm truyện (tên/slug)"
          value={storyQ}
          onChange={(e) => pushUpdates({ storyQ: e.target.value })}
        />
        <Input
          placeholder="Tìm người dùng"
          value={userQ}
          onChange={(e) => pushUpdates({ userQ: e.target.value })}
        />
      </div>
    </div>
  );
}
