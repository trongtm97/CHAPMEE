"use client";

import Link from "next/link";
import { useState } from "react";
import { GroupFilterSheet } from "@/components/community/groups/GroupFilterSheet";
import { GroupFilterTabs } from "@/components/community/groups/GroupFilterTabs";
import { GroupListItem } from "@/components/community/groups/GroupListItem";
import { GroupPagination } from "@/components/community/groups/GroupPagination";
import { GroupQuickActions } from "@/components/community/groups/GroupQuickActions";
import { GroupSearchBar } from "@/components/community/groups/GroupSearchBar";
import { GroupSortControl } from "@/components/community/groups/GroupSortControl";
import { MyGroupsSection } from "@/components/community/groups/MyGroupsSection";
import { RecommendedGroupsSection } from "@/components/community/groups/RecommendedGroupsSection";
import { COMMUNITY_PAGE_SHELL_CLASS } from "@/components/community/community-page-shell";
import { buildCommunityGroupsHref } from "@/lib/community/community-groups-query";
import { formatCatalogCount } from "@/lib/stories/story-catalog-query";
import type {
  CommunityGroupItem,
  CommunityGroupGenre,
  CommunityGroupsCatalogResult
} from "@/types/community-group";

type CommunityGroupsPageProps = {
  catalog: CommunityGroupsCatalogResult;
  myGroups: CommunityGroupItem[];
  recommended: CommunityGroupItem[];
  isLoggedIn: boolean;
  showPersonalSections: boolean;
};

export function CommunityGroupsPage({
  catalog,
  isLoggedIn,
  myGroups,
  recommended,
  showPersonalSections
}: CommunityGroupsPageProps) {
  const [filterOpen, setFilterOpen] = useState(false);
  const hasFilters =
    Boolean(catalog.query) ||
    Boolean(catalog.genre) ||
    catalog.status !== "all" ||
    Boolean(catalog.tab);

  return (
    <div className={COMMUNITY_PAGE_SHELL_CLASS}>
      <header className="space-y-1">
        <Link
          className="text-sm font-semibold text-cyan-300 hover:text-cyan-200"
          href="/community"
        >
          ← Cộng đồng
        </Link>
        <h1 className="text-xl font-black text-zinc-50">Nhóm truyện</h1>
        <p className="text-sm text-zinc-400">Tìm fandom của truyện bạn thích.</p>
      </header>

      <div className="mt-3 space-y-3">
        <GroupSearchBar
          genre={catalog.genre}
          query={catalog.query}
          sort={catalog.sort}
          status={catalog.status}
          tab={catalog.tab}
        />

        <GroupQuickActions />

        <GroupFilterTabs
          activeTab={catalog.tab}
          genre={catalog.genre}
          query={catalog.query}
          sort={catalog.sort}
        />

        {showPersonalSections && !catalog.tab && catalog.status === "all" && !catalog.query ? (
          <>
            <MyGroupsSection groups={myGroups} isLoggedIn={isLoggedIn} />
            <RecommendedGroupsSection groups={recommended} />
          </>
        ) : null}

        <section className="space-y-2">
          <div className="flex items-end justify-between gap-2">
            <h2 className="text-sm font-black text-zinc-100">Tất cả nhóm</h2>
            <p className="text-[11px] text-zinc-500">
              {formatCatalogCount(catalog.totalCount)} nhóm
            </p>
          </div>

          <div className="flex items-stretch gap-2">
            <GroupSortControl
              genre={catalog.genre}
              query={catalog.query}
              sort={catalog.sort}
              status={catalog.status}
              tab={catalog.tab}
            />
            <div className="flex flex-col justify-end">
              <button
                className={`h-9 rounded-lg border px-3 text-xs font-bold transition ${
                  hasFilters
                    ? "border-cyan-300/40 bg-cyan-300/15 text-cyan-100"
                    : "border-white/10 bg-white/[0.03] text-zinc-200"
                }`}
                onClick={() => setFilterOpen(true)}
                type="button"
              >
                Bộ lọc
              </button>
            </div>
          </div>

          {catalog.error ? (
            <p className="rounded-xl border border-rose-400/30 bg-rose-500/10 px-3 py-3 text-sm text-rose-100">
              {catalog.error}
            </p>
          ) : null}

          {catalog.items.length === 0 ? (
            <div className="space-y-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-4 text-center">
              <p className="text-sm text-zinc-400">Chưa tìm thấy nhóm phù hợp.</p>
              <div className="flex flex-wrap justify-center gap-2">
                <Link
                  className="inline-flex h-9 items-center rounded-lg border border-cyan-300/35 bg-cyan-300/10 px-3 text-xs font-bold text-cyan-100"
                  href="/community/groups/new"
                >
                  Đề xuất nhóm mới
                </Link>
                {hasFilters ? (
                  <Link
                    className="inline-flex h-9 items-center rounded-lg border border-white/10 px-3 text-xs font-bold text-zinc-200"
                    href={buildCommunityGroupsHref()}
                  >
                    Xóa bộ lọc
                  </Link>
                ) : null}
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {catalog.items.map((group) => (
                <GroupListItem group={group} key={group.id} />
              ))}
            </div>
          )}

          <GroupPagination
            genre={catalog.genre}
            page={catalog.page}
            pageSize={catalog.pageSize}
            query={catalog.query}
            sort={catalog.sort}
            status={catalog.status}
            tab={catalog.tab}
            totalPages={catalog.totalPages}
          />
        </section>
      </div>

      <GroupFilterSheet
        genre={catalog.genre}
        genres={catalog.genres}
        onClose={() => setFilterOpen(false)}
        open={filterOpen}
        query={catalog.query}
        sort={catalog.sort}
        status={catalog.status}
        tab={catalog.tab}
      />
    </div>
  );
}
