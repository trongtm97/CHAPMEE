"use client";



import { Suspense, useEffect, useState } from "react";

import { useSearchParams } from "next/navigation";

import { COMMUNITY_PAGE_SHELL_CLASS } from "@/components/community/community-page-shell";

import { MobileBackHeader } from "@/components/me/MobileBackHeader";

import { AuthorGroupCarousel } from "@/components/community/AuthorGroupCarousel";

import { COMMUNITY_AUTHORS_SECTION_ID } from "@/lib/community/community-author-url";

import { CommunityFeedTabs } from "@/components/community/CommunityFeedTabs";

import { CommunityHeader } from "@/components/community/CommunityHeader";

import { CommunityHotGroupsSection } from "@/components/community/CommunityHotGroupsSection";

import { CommunityInfiniteFeed } from "@/components/community/CommunityInfiniteFeed";

import { CommunityStatusComposer } from "@/components/community/CommunityStatusComposer";

import { CommunitySearchBar } from "@/components/community/CommunitySearchBar";

import type { CommunityStoryOption } from "@/lib/community/getStoriesForCommunityPost";

import type { AuthorCommunityGroup, CommunityFeedTab, StoryCommunityGroup } from "@/types/community";



export type CommunityLayoutProps = {

  storyGroups: StoryCommunityGroup[];

  authorGroups: AuthorCommunityGroup[];

  isLoggedIn: boolean;

  displayName?: string | null;

  avatarUrl?: string | null;

  stories?: CommunityStoryOption[];

};



function parseCommunityTab(value: string | null): CommunityFeedTab {

  if (value === "hot" || value === "new" || value === "following" || value === "for_you") {

    return value;

  }

  return "for_you";

}



function CommunityLayoutContent({

  authorGroups,

  avatarUrl,

  displayName,

  isLoggedIn,

  stories = [],

  storyGroups

}: CommunityLayoutProps) {

  const searchParams = useSearchParams();

  const searchQuery = searchParams.get("q") ?? "";

  const fromMe = searchParams.get("from") === "me";

  const [activeTab, setActiveTab] = useState<CommunityFeedTab>(() =>

    parseCommunityTab(searchParams.get("tab"))

  );

  const [feedRefreshToken, setFeedRefreshToken] = useState(0);



  useEffect(() => {

    setActiveTab(parseCommunityTab(searchParams.get("tab")));

  }, [searchParams]);



  useEffect(() => {

    if (typeof window === "undefined" || window.location.hash !== `#${COMMUNITY_AUTHORS_SECTION_ID}`) {

      return;

    }



    const frame = window.requestAnimationFrame(() => {

      document.getElementById(COMMUNITY_AUTHORS_SECTION_ID)?.scrollIntoView({

        behavior: "smooth",

        block: "start"

      });

    });



    return () => window.cancelAnimationFrame(frame);

  }, []);



  function scrollToComposer() {

    document.getElementById("community-status-composer")?.scrollIntoView({

      behavior: "smooth",

      block: "center"

    });

  }



  return (

    <div className={COMMUNITY_PAGE_SHELL_CLASS}>

      {fromMe ? <MobileBackHeader fallbackHref="/me" title="Nhóm theo dõi" /> : null}

      <div className="space-y-2.5">

        <CommunityHeader />

        <CommunitySearchBar />

        <div id="community-status-composer">

          <CommunityStatusComposer

            avatarUrl={avatarUrl}

            displayName={displayName}

            isLoggedIn={isLoggedIn}

            onPosted={() => setFeedRefreshToken((value) => value + 1)}

            stories={stories}

          />

        </div>

      </div>



      <div className="sticky top-0 z-20 -mx-4 mt-2 border-b border-white/5 bg-[#0b1016]/94 px-4 py-2 backdrop-blur-lg md:static md:mx-0 md:border-0 md:bg-transparent md:px-0 md:py-0 md:backdrop-blur-none">

        <CommunityFeedTabs activeTab={activeTab} onChange={setActiveTab} />

      </div>



      <div className="mt-2.5 space-y-2.5">

        <CommunityHotGroupsSection authorGroups={authorGroups} storyGroups={storyGroups} />



        <section className="scroll-mt-24" id={COMMUNITY_AUTHORS_SECTION_ID}>

          <AuthorGroupCarousel groups={authorGroups} />

        </section>



        <CommunityInfiniteFeed

          activeTab={activeTab}

          onWriteClick={scrollToComposer}

          refreshToken={feedRefreshToken}

          searchQuery={searchQuery}

        />

      </div>

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

  avatarUrl,

  displayName,

  isLoggedIn,

  stories = [],

  storyGroups

}: CommunityLayoutProps) {

  return (

    <div className={`space-y-2.5 ${COMMUNITY_PAGE_SHELL_CLASS}`}>

      <CommunityHeader />

      <CommunityStatusComposer

        avatarUrl={avatarUrl}

        displayName={displayName}

        isLoggedIn={isLoggedIn}

        stories={stories}

      />

      <CommunityHotGroupsSection authorGroups={authorGroups} storyGroups={storyGroups} />

    </div>

  );

}

