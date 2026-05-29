import type { CommunityFeedTab } from "@/types/community";

export type CommunityFeedSource = "posts" | "comments";

export type CommunityFeedCursorPayload = {
  tab: CommunityFeedTab;
  source: CommunityFeedSource;
  createdAt: string;
  id: string;
  hotScore?: number;
};

export function encodeCommunityFeedCursor(
  payload: CommunityFeedCursorPayload
): string {
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
}

export function decodeCommunityFeedCursor(
  cursor: string | null | undefined
): CommunityFeedCursorPayload | null {
  if (!cursor) {
    return null;
  }

  try {
    const parsed = JSON.parse(
      Buffer.from(cursor, "base64url").toString("utf8")
    ) as CommunityFeedCursorPayload;

    if (!parsed.createdAt || !parsed.id) {
      return null;
    }

    return {
      ...parsed,
      source: parsed.source ?? "posts"
    };
  } catch {
    return null;
  }
}
