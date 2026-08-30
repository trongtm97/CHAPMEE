export const publicContentStatuses = ["approved", "published"] as const;

export type PublicContentStatus = (typeof publicContentStatuses)[number];
export type StoryVisibility = "public" | "private";
export type CommunityPostVisibilityStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "hidden";

/** Truyện hiển thị công khai: đã xuất bản/duyệt và visibility = public. */
export function canViewPublicStory(
  status: string | null | undefined,
  visibility: string | null | undefined
) {
  return (
    visibility === "public" &&
    publicContentStatuses.includes(status as PublicContentStatus)
  );
}

/**
 * Chương hiển thị với độc giả khi:
 * - Chương ở trạng thái đăng (published/approved) — nháp luôn ẩn, không theo truyện.
 * - Truyện công khai — đổi truyện nháp/private ↔ public không cần đăng lại chương.
 */
export function canViewPublicEpisode(
  episodeStatus: string | null | undefined,
  storyStatus: string | null | undefined,
  storyVisibility: string | null | undefined
) {
  return (
    publicContentStatuses.includes(episodeStatus as PublicContentStatus) &&
    canViewPublicStory(storyStatus, storyVisibility)
  );
}

/** @deprecated Alias — dùng canViewPublicEpisode. */
export const isEpisodePubliclyVisible = canViewPublicEpisode;

if (require.main === module) {
  const pub = (s: string, v: string) => canViewPublicStory(s, v);
  const ep = (es: string, ss: string, sv: string) =>
    canViewPublicEpisode(es, ss, sv);

  console.assert(
    ep("published", "draft", "private") === false,
    "published chapter hidden when story draft/private"
  );
  console.assert(
    ep("published", "published", "public") === true,
    "published chapter visible when story public"
  );
  console.assert(
    ep("draft", "published", "public") === false,
    "draft chapter stays hidden even on public story"
  );
  console.assert(
    ep("published", "published", "private") === false &&
      ep("published", "published", "public") === true,
    "published chapter follows story visibility toggle"
  );
  console.assert(pub("published", "public") === true, "public published story");
  console.log("contentVisibility self-check ok");
}

export function canViewCommunityPost(
  status: string | null | undefined,
  isOwner = false,
  isAdminOrModerator = false
) {
  return status === "approved" || isOwner || isAdminOrModerator;
}
