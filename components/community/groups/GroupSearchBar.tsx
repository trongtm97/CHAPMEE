"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { AppSearchField } from "@/components/ui/AppSearchField";
import { buildCommunityGroupsHref } from "@/lib/community/community-groups-query";
import type { CommunityGroupSort, CommunityGroupStatusFilter, CommunityGroupTab } from "@/types/community-group";

type GroupSearchBarProps = {
  query: string;
  genre: string;
  sort: CommunityGroupSort;
  status: CommunityGroupStatusFilter;
  tab: CommunityGroupTab | null;
};

export function GroupSearchBar({ genre, query, sort, status, tab }: GroupSearchBarProps) {
  const router = useRouter();
  const [value, setValue] = useState(query);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    router.push(
      buildCommunityGroupsHref({
        q: value,
        genre: genre || undefined,
        sort,
        status: status !== "all" ? status : undefined,
        tab: tab ?? undefined,
        page: 1
      })
    );
  }

  return (
    <form className="chap-card-soft p-2" onSubmit={onSubmit}>
      <AppSearchField
        name="q"
        onChange={setValue}
        placeholder="Tìm nhóm, truyện, tác giả..."
        value={value}
      />
    </form>
  );
}
