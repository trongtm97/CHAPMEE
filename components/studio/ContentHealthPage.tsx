"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ContentQualityCard } from "@/components/studio/ContentQualityCard";
import { ContentQualityDetailPanel } from "@/components/studio/ContentQualityDetail";
import { QUALITY_TAB_LABELS } from "@/lib/content-quality/labels";
import type { AuthorContentHealthResult } from "@/lib/content-quality/get-author-content-health";
import type { ContentQualityDetail, ContentQualityListTab } from "@/types/content-quality";
import type { CreatorAlgorithmInsight } from "@/types/algorithm-explanation";

type ContentHealthPageProps = {
  data: AuthorContentHealthResult;
  initialDetail: ContentQualityDetail | null;
  algorithmInsights?: CreatorAlgorithmInsight | null;
};

const TABS: ContentQualityListTab[] = [
  "all",
  "needs_action",
  "in_review",
  "restored",
  "permanently_hidden"
];

export function ContentHealthPage({
  data,
  initialDetail,
  algorithmInsights = null
}: ContentHealthPageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeTab = (searchParams.get("tab") as ContentQualityListTab) || "all";
  const [detail, setDetail] = useState<ContentQualityDetail | null>(initialDetail);
  const [, startTransition] = useTransition();

  useEffect(() => {
    setDetail(initialDetail);
  }, [initialDetail]);

  const setTab = useCallback(
    (tab: ContentQualityListTab) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("tab", tab);
      params.delete("story");
      router.replace(`?${params.toString()}`);
      setDetail(null);
    },
    [router, searchParams]
  );

  function openDetail(storyId: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (!params.get("tab")) {
      params.set("tab", activeTab);
    }
    params.set("story", storyId);
    startTransition(() => {
      router.push(`?${params.toString()}`);
    });
  }

  return (
    <div className="space-y-6">
      <p className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm leading-6 text-zinc-400">
        ChapMee đánh giá chất lượng dựa trên nhiều tín hiệu (đọc, báo cáo, hoàn thiện nội dung)
        và xác nhận của moderator — không chỉ vì một vài đánh giá xấu. Mọi bước xử lý đều
        được lưu lịch sử.
      </p>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {TABS.map((tab) => (
          <button
            className={`shrink-0 rounded-full border px-4 py-2 text-sm font-semibold transition ${
              activeTab === tab
                ? "border-sky-300 bg-sky-300 text-zinc-950"
                : "border-white/10 bg-white/5 text-zinc-300 hover:bg-white/10"
            }`}
            key={tab}
            onClick={() => setTab(tab)}
            type="button"
          >
            {QUALITY_TAB_LABELS[tab]} ({data.counts[tab]})
          </button>
        ))}
      </div>

      {data.items.length === 0 ? (
        <p className="rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-100">
          Không có mục nào trong tab này. Truyện của bạn đang ổn định.
        </p>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {data.items.map((item) => (
            <ContentQualityCard
              item={item}
              key={item.id}
              onOpenDetail={openDetail}
            />
          ))}
        </div>
      )}

      {detail ? (
        <ContentQualityDetailPanel
          algorithmInsights={algorithmInsights}
          detail={detail}
          onClose={() => {
            setDetail(null);
            const params = new URLSearchParams(searchParams.toString());
            params.delete("story");
            router.replace(`?${params.toString()}`);
          }}
          onUpdated={() => router.refresh()}
        />
      ) : null}
    </div>
  );
}
