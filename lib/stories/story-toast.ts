export type StoryToastKey =
  | "saved"
  | "unsaved"
  | "follow_creator"
  | "unfollow_creator"
  | "follow_story"
  | "unfollow_story";

const STORY_TOAST_MESSAGES: Record<StoryToastKey, string> = {
  saved: "Đã lưu truyện.",
  unsaved: "Đã bỏ lưu.",
  follow_creator: "Đã theo dõi tác giả.",
  unfollow_creator: "Đã bỏ theo dõi tác giả.",
  follow_story: "Đã theo dõi truyện.",
  unfollow_story: "Đã bỏ theo dõi truyện."
};

export function storyToastMessage(key: StoryToastKey) {
  return STORY_TOAST_MESSAGES[key];
}

export function appendStoryToastParam(returnTo: string, key: StoryToastKey) {
  const [path, query = ""] = returnTo.split("?");
  const params = new URLSearchParams(query);
  params.set("storyToast", key);
  const next = params.toString();
  return next ? `${path}?${next}` : path;
}

export function parseStoryToastParam(
  value: string | null | undefined
): StoryToastKey | null {
  if (!value) {
    return null;
  }
  if (value in STORY_TOAST_MESSAGES) {
    return value as StoryToastKey;
  }
  return null;
}
