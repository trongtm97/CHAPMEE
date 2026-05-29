"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ContinueReadingList } from "@/components/library/ContinueReadingList";
import { CreateCollectionSheet } from "@/components/library/CreateCollectionSheet";
import { FollowingLibraryTab } from "@/components/library/FollowingLibraryTab";
import { LibraryHeader } from "@/components/library/LibraryHeader";
import { LibraryTabs } from "@/components/library/LibraryTabs";
import { SavedStoriesList } from "@/components/library/SavedStoriesList";
import { StoryCollectionsList } from "@/components/library/StoryCollectionsList";
import { parseLibraryTab } from "@/lib/library/library-tabs";
import type { LibraryPageData, LibraryTab } from "@/types/library";

type LibraryPageProps = {
  data: LibraryPageData;
};

export function LibraryPage({ data }: LibraryPageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<LibraryTab>("reading");
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [createOpen, setCreateOpen] = useState(false);

  useEffect(() => {
    setActiveTab(parseLibraryTab(searchParams.get("tab")));
  }, [searchParams]);

  function handleTabChange(tab: LibraryTab) {
    setActiveTab(tab);
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tab);
    router.replace(`/me/library?${params.toString()}`, { scroll: false });
  }

  return (
    <section className="mx-auto max-w-lg space-y-3 pb-24 lg:max-w-2xl">
      <LibraryHeader
        onCreateCollection={() => setCreateOpen(true)}
        onSearchChange={setSearchQuery}
        onSearchToggle={() => setSearchOpen((open) => !open)}
        searchOpen={searchOpen}
        searchQuery={searchQuery}
      />

      <LibraryTabs activeTab={activeTab} onChange={handleTabChange} />

      <div className="min-h-[12rem]">
        {activeTab === "reading" ? (
          <ContinueReadingList
            items={data.continueReading}
            searchQuery={searchQuery}
            total={data.continueReadingTotal}
          />
        ) : null}

        {activeTab === "saved" ? (
          <SavedStoriesList
            items={data.savedStories}
            searchQuery={searchQuery}
            total={data.savedStoriesTotal}
          />
        ) : null}

        {activeTab === "collections" ? (
          <StoryCollectionsList
            collections={data.collections}
            onCreateClick={() => setCreateOpen(true)}
            searchQuery={searchQuery}
          />
        ) : null}

        {activeTab === "following" ? (
          <FollowingLibraryTab
            authors={data.followedAuthors}
            groups={data.followedGroups}
            searchQuery={searchQuery}
            stories={data.followedStories}
          />
        ) : null}
      </div>

      {createOpen ? (
        <CreateCollectionSheet onClose={() => setCreateOpen(false)} />
      ) : null}
    </section>
  );
}
