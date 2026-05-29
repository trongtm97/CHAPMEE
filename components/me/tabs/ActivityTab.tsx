"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CombinedEmptyState } from "@/components/me/CombinedEmptyState";
import { MeActivitiesSkeleton } from "@/components/me/MeActivitiesSkeleton";
import { useMeActivities } from "@/components/me/me-activities-context";
import {
  PersonalActivityTimeline,
  type ActivityFilter
} from "@/components/me/PersonalActivityTimeline";
import { Card, ErrorState } from "@/components/ui";
import type { MePageData } from "@/types/me-page";
import type { PersonalActivityItem } from "@/types/me-page";

const filters: { id: ActivityFilter; label: string }[] = [
  { id: "all", label: "Tất cả" },
  { id: "comment", label: "Bình luận" },
  { id: "save", label: "Đã lưu" },
  { id: "follow", label: "Theo dõi" },
  { id: "group", label: "Nhóm" }
];

function matchesFilter(item: PersonalActivityItem, filter: ActivityFilter) {
  if (filter === "all") return true;
  if (filter === "comment") return item.type === "comment";
  if (filter === "save") return item.type === "save";
  if (filter === "follow") return item.type === "follow";
  if (filter === "group") return item.type === "top_fan" || item.type === "thank_you";
  return true;
}

type ActivityTabProps = {
  data: MePageData;
};

export function ActivityTab({ data }: ActivityTabProps) {
  const { activities, error, loading, refresh } = useMeActivities();
  const [filter, setFilter] = useState<ActivityFilter>("all");
  const filteredItems = useMemo(
    () => activities.filter((item) => matchesFilter(item, filter)),
    [activities, filter]
  );

  if (loading && activities.length === 0) {
    return <MeActivitiesSkeleton count={5} />;
  }

  if (error && activities.length === 0) {
    return (
      <div className="space-y-3">
        <ErrorState message={error} title="Không tải được hoạt động" />
        <button
          className="tap-highlight w-full rounded-full border border-white/10 py-2 text-sm font-semibold text-zinc-300"
          onClick={() => {
            void refresh();
          }}
          type="button"
        >
          Thử lại
        </button>
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <CombinedEmptyState
        description="Bình luận, lưu truyện, theo dõi tác giả hoặc tham gia poll sẽ hiện ở đây."
        title="Chưa có hoạt động nào."
      />
    );
  }

  return (
    <div className="space-y-3">
      <div className="-mx-1 overflow-x-auto pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="flex min-w-max gap-1.5 px-1">
          {filters.map((item) => (
            <button
              className={`tap-highlight rounded-full border px-3 py-1.5 text-[0.68rem] font-semibold transition ${
                filter === item.id
                  ? "border-cyan-300/30 bg-cyan-300/10 text-cyan-100"
                  : "border-white/8 text-zinc-500"
              }`}
              key={item.id}
              onClick={() => setFilter(item.id)}
              type="button"
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {filteredItems.length > 0 ? (
        <PersonalActivityTimeline
          filter={filter}
          items={activities}
          showHeader={false}
          title="Hoạt động của bạn"
          variant="full"
        />
      ) : (
        <p className="rounded-[1rem] border border-white/8 bg-white/[0.02] px-4 py-6 text-center text-sm text-zinc-500">
          Không có hoạt động trong mục này.
        </p>
      )}

      {data.communityGroupsCount > 0 ? (
        <Card className="flex items-center justify-between gap-3 p-3">
          <p className="text-sm text-zinc-400">
            Đang theo dõi{" "}
            <span className="font-bold text-white">{data.communityGroupsCount}</span> nhóm truyện
          </p>
          <Link
            className="text-xs font-semibold text-cyan-200"
            href="/community?tab=following"
          >
            Xem nhóm
          </Link>
        </Card>
      ) : null}
    </div>
  );
}
