import { NextResponse } from "next/server";
import { getAuthorGroups } from "@/lib/community/get-author-groups";
import { getCommunityFeedPage } from "@/lib/community/get-community-feed";
import { getStoryGroups } from "@/lib/community/get-story-groups";
import type { CommunityFeedTab } from "@/types/community";

export const dynamic = "force-dynamic";

const validTabs: CommunityFeedTab[] = ["for_you", "hot", "new", "following"];

function parseTab(value: string | null): CommunityFeedTab {
  if (value && validTabs.includes(value as CommunityFeedTab)) {
    return value as CommunityFeedTab;
  }

  return "for_you";
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const tab = parseTab(searchParams.get("tab"));
  const cursor = searchParams.get("cursor");
  const limit = Number(searchParams.get("limit") ?? "12");
  const q = searchParams.get("q") ?? undefined;

  const [{ groups: storyGroups }, { groups: authorGroups }] = await Promise.all([
    getStoryGroups(),
    getAuthorGroups()
  ]);

  const result = await getCommunityFeedPage({
    tab,
    cursor,
    limit,
    q,
    storyGroups,
    authorGroups
  });

  if (result.error) {
    return NextResponse.json(
      { items: [], nextCursor: null, hasMore: false, error: result.error },
      { status: 500 }
    );
  }

  return NextResponse.json(result);
}
