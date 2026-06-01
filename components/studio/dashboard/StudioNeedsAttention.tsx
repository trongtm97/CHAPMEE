"use client";

import Link from "next/link";
import { useState } from "react";
import { StudioActionCard } from "@/components/studio/dashboard/shared/StudioActionCard";
import { StudioBadge } from "@/components/studio/dashboard/shared/StudioBadge";
import { StudioEmptyState } from "@/components/studio/dashboard/shared/StudioEmptyState";
import {
  studioGhostPillBtn,
  studioPillBtn
} from "@/components/studio/dashboard/shared/styles";
import { studioPath } from "@/lib/studio/constants";
import type { StudioAttentionGroup } from "@/types/creator";

type StudioNeedsAttentionProps = {
  groups: StudioAttentionGroup[];
  viewAllHref?: string;
  maxVisible?: number;
};

const severityClass: Record<StudioAttentionGroup["severity"], string> = {
  error: "border-red-400/25 bg-red-400/[0.04]",
  info: "border-white/10",
  warning: "border-amber-400/25 bg-amber-400/[0.04]"
};

const severityLabel: Record<StudioAttentionGroup["severity"], string> = {
  error: "Nghiêm trọng",
  info: "Lưu ý",
  warning: "Cảnh báo"
};

const severityVariant: Record<
  StudioAttentionGroup["severity"],
  "danger" | "warning" | "default"
> = {
  error: "danger",
  info: "default",
  warning: "warning"
};

export function StudioNeedsAttention({
  groups,
  maxVisible = 3,
  viewAllHref = studioPath("/stories")
}: StudioNeedsAttentionProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const visibleGroups = groups.slice(0, maxVisible);
  const hasMore = groups.length > maxVisible;

  if (groups.length === 0) {
    return (
      <StudioEmptyState
        description="Không có cảnh báo hay tồn đọng nào."
        title="Không cần xử lý thêm"
      />
    );
  }

  return (
    <div className="space-y-1.5">
      <ul className="space-y-1.5">
        {visibleGroups.map((group) => {
          const expanded = expandedId === group.id;
          const hasPreview = group.previewItems.length > 0;

          return (
            <li className="min-w-0" key={group.id}>
              <StudioActionCard
                action={
                  <div className="flex shrink-0 gap-1.5">
                    {hasPreview ? (
                      <button
                        className={studioGhostPillBtn}
                        onClick={() =>
                          setExpandedId(expanded ? null : group.id)
                        }
                        type="button"
                      >
                        {expanded ? "Thu gọn" : "Danh sách"}
                      </button>
                    ) : null}
                    <Link className={studioPillBtn} href={group.href}>
                      Xử lý
                    </Link>
                  </div>
                }
                className={severityClass[group.severity]}
                description={group.description}
                meta={
                  <>
                    <StudioBadge soft variant={severityVariant[group.severity]}>
                      {severityLabel[group.severity]}
                    </StudioBadge>
                    <span className="text-xs text-zinc-500">×{group.count}</span>
                  </>
                }
                title={group.title}
              />

              {expanded && hasPreview ? (
                <ul className="mt-1 space-y-0.5 rounded-lg border border-white/10 bg-black/20 px-2 py-1.5">
                  {group.previewItems.map((item) => (
                    <li key={item.id}>
                      <Link
                        className="block truncate rounded px-1 py-1 text-xs text-zinc-300 hover:bg-white/5 hover:text-white"
                        href={item.href}
                      >
                        {item.title}
                      </Link>
                    </li>
                  ))}
                  {group.count > group.previewItems.length ? (
                    <li>
                      <Link
                        className="block px-1 py-1 text-xs font-semibold text-cyan-300"
                        href={group.href}
                      >
                        Xem tất cả ({group.count})
                      </Link>
                    </li>
                  ) : null}
                </ul>
              ) : null}
            </li>
          );
        })}
      </ul>

      {hasMore ? (
        <div className="flex justify-end">
          <Link className={studioGhostPillBtn} href={viewAllHref}>
            Xem tất cả ({groups.length})
          </Link>
        </div>
      ) : null}
    </div>
  );
}

/** @deprecated Use StudioNeedsAttention */
export const StudioAttentionList = StudioNeedsAttention;
