import { resolvePublicUrl } from "@/lib/seo/metadata";

/** YouTube description should lead with ChapMee source link. */
export function descriptionHasChapmeeSourceLink(description: string | null | undefined): boolean {
  if (!description?.trim()) {
    return false;
  }
  const text = description.toLowerCase();
  if (text.includes("tác phẩm gốc tại") || text.includes("tac pham goc tai")) {
    return true;
  }
  const site = resolvePublicUrl("/");
  if (!site) return false;
  const host = site.replace(/\/$/, "").replace(/^https?:\/\//i, "").toLowerCase();
  return Boolean(host && text.includes(host));
}

export const CHAPMee_SOURCE_POLICY_HINT =
  "Video YouTube cần đặt link nguồn ChapMee ở đầu mô tả video: \"Tác phẩm gốc tại: ...\"";

export const CHAPMee_AUDIO_SOURCE_POLICY_HINT =
  "Audio YouTube cần đặt link nguồn ChapMee ở đầu mô tả video: \"Tác phẩm gốc tại: ...\"";
