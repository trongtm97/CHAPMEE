export type StoryGroupFeedCursorPayload = {
  createdAt: string;
  id: string;
};

export function encodeStoryGroupFeedCursor(
  payload: StoryGroupFeedCursorPayload
): string {
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
}

export function decodeStoryGroupFeedCursor(
  cursor: string | null | undefined
): StoryGroupFeedCursorPayload | null {
  if (!cursor) {
    return null;
  }

  try {
    const parsed = JSON.parse(
      Buffer.from(cursor, "base64url").toString("utf8")
    ) as StoryGroupFeedCursorPayload;

    if (!parsed.createdAt || !parsed.id) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}
