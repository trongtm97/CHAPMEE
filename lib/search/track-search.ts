import { sanitizeSearchQueryForMetadata } from "@/lib/search/sanitize-query";
import { trackServerExposure, trackServerUserAction } from "@/lib/tracking/track-server";
import type { SearchResultItem } from "@/types/search";

function mapTrackingItemType(resultType: SearchResultItem["resultType"]) {
  switch (resultType) {
    case "story":
      return "story" as const;
    case "chapter":
      return "chapter" as const;
    case "author":
      return "author_profile" as const;
    case "content_post":
      return "content_post" as const;
    default:
      return "story" as const;
  }
}

export async function trackSearchResults(
  query: string,
  results: SearchResultItem[],
  context: {
    requestId: string;
    algorithmVersion: string;
    userId: string | null;
  }
) {
  const safeQuery = sanitizeSearchQueryForMetadata(query);

  for (let index = 0; index < results.length; index += 1) {
    const item = results[index];
    const itemType = mapTrackingItemType(item.resultType);

    void trackServerExposure(context.userId, {
      surface: "search",
      itemType,
      itemId: item.id,
      storyId: item.storyId,
      chapterId: item.resultType === "chapter" ? item.id : null,
      authorUserId: item.authorUserId,
      position: index,
      requestId: context.requestId,
      algorithmVersion: context.algorithmVersion,
      candidatePool: "personalized"
    });
  }

  if (safeQuery) {
    void trackServerUserAction(context.userId, {
      surface: "search",
      actionType: "impression",
      itemType: "story",
      itemId: context.requestId,
      metadata: {
        query: safeQuery,
        result_count: results.length,
        request_id: context.requestId
      },
      algorithmVersion: context.algorithmVersion
    });
  }
}

export async function trackSearchClick(
  query: string,
  input: {
    resultType: SearchResultItem["resultType"];
    itemId: string;
    storyId?: string | null;
    authorUserId?: string | null;
  },
  position: number,
  context: { requestId: string; algorithmVersion: string; userId: string | null }
) {
  const safeQuery = sanitizeSearchQueryForMetadata(query);
  const itemType = mapTrackingItemType(input.resultType);

  void trackServerUserAction(context.userId, {
    surface: "search",
    actionType: "click",
    itemType,
    itemId: input.itemId,
    storyId: input.storyId ?? null,
    chapterId: input.resultType === "chapter" ? input.itemId : null,
    authorUserId: input.authorUserId ?? null,
    metadata: {
      ...(safeQuery ? { query: safeQuery } : {}),
      result_type: input.resultType,
      request_id: context.requestId,
      position
    },
    algorithmVersion: context.algorithmVersion
  });
}
