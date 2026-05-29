"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { COMMUNITY_PAGE_SHELL_CLASS } from "@/components/community/community-page-shell";
import { MobileBackHeader } from "@/components/me/MobileBackHeader";
import { CommunityComposerSheet } from "@/components/community/CommunityComposerSheet";
import { CommunityFeedTabs } from "@/components/community/CommunityFeedTabs";
import { CommunityHeader } from "@/components/community/CommunityHeader";
import { CommunityHotGroupsSection } from "@/components/community/CommunityHotGroupsSection";
import { CommunityInfiniteFeed } from "@/components/community/CommunityInfiniteFeed";
import { CommunityQuickActions } from "@/components/community/CommunityQuickActions";
import { CommunitySearchBar } from "@/components/community/CommunitySearchBar";
import type { AuthorCommunityGroup, CommunityFeedTab, StoryCommunityGroup } from "@/types/community";

export type CommunityLayoutProps = {
  storyGroups: StoryCommunityGroup[];
  authorGroups: AuthorCommunityGroup[];
  isLoggedIn: boolean;
};

function parseCommunityTab(value: string | null): CommunityFeedTab {
  if (value === "hot" || value === "new" || value === "following" || value === "for_you") {
    return value;
  }
  return "for_you";
}

function CommunityLayoutContent({
  authorGroups,
  isLoggedIn,
  storyGroups
}: CommunityLayoutProps) {
  const searchParams = useSearchParams();
  const searchQuery = searchParams.get("q") ?? "";
  const fromMe = searchParams.get("from") === "me";
  const [activeTab, setActiveTab] = useState<CommunityFeedTab>(() =>
    parseCommunityTab(searchParams.get("tab"))
  );
  const [composerOpen, setComposerOpen] = useState(false);

  useEffect(() => {
    setActiveTab(parseCommunityTab(searchParams.get("tab")));
  }, [searchParams]);

  const topAuthor = authorGroups.find((group) => group.isReplying) ?? authorGroups[0];

  return (
    <div className={COMMUNITY_PAGE_SHELL_CLASS}>
      {fromMe ? <MobileBackHeader fallbackHref="/me" title="Nhóm theo dõi" /> : null}
      <div className="space-y-2.5">
        <CommunityHeader />
        <CommunitySearchBar />
        <CommunityQuickActions
          isLoggedIn={isLoggedIn}
          onWriteClick={() => setComposerOpen(true)}
          topAuthor={topAuthor}
        />
      </div>

      <div className="sticky top-0 z-20 -mx-4 mt-2 border-b border-white/5 bg-[#0b1016]/94 px-4 py-2 backdrop-blur-lg md:static md:mx-0 md:border-0 md:bg-transparent md:px-0 md:py-0 md:backdrop-blur-none">
        <CommunityFeedTabs activeTab={activeTab} onChange={setActiveTab} />
      </div>

      <div className="mt-2.5 space-y-2.5">
        <CommunityHotGroupsSection authorGroups={authorGroups} storyGroups={storyGroups} />

        <CommunityInfiniteFeed
          activeTab={activeTab}
          onWriteClick={() => setComposerOpen(true)}
          searchQuery={searchQuery}
        />
      </div>

      <CommunityComposerSheet
        isLoggedIn={isLoggedIn}
        onClose={() => setComposerOpen(false)}
        open={composerOpen}
      />
    </div>
  );
}

export function CommunityLayout(props: CommunityLayoutProps) {
  return (
    <Suspense fallback={<CommunityLayoutFallback {...props} />}>
      <CommunityLayoutContent {...props} />
    </Suspense>
  );
}

/** @deprecated Use CommunityLayout */
export const MobileCommunityLayout = CommunityLayout;

function CommunityLayoutFallback({
  authorGroups,
  isLoggedIn,
  storyGroups
}: CommunityLayoutProps) {
  return (
    <div className={`space-y-2.5 ${COMMUNITY_PAGE_SHELL_CLASS}`}>
      <CommunityHeader />
      <CommunityQuickActions
        isLoggedIn={isLoggedIn}
        onWriteClick={() => undefined}
        topAuthor={authorGroups[0]}
      />
      <CommunityHotGroupsSection authorGroups={authorGroups} storyGroups={storyGroups} />
    </div>
  );
}
