import type {
  StudioAttentionGroup,
  StudioTodayAction
} from "@/types/creator";

/** Tránh lặp giữa "Hôm nay" và "Cần xử lý". */
const ATTENTION_TODAY_OVERLAP: Record<string, string> = {
  "content-quality": "quality-review",
  "missing-cover-group": "fix-covers",
  "new-comments": "reply-comments",
  "rejected-chapters": "rejected-chapters"
};

export function filterAttentionGroupsForDashboard(
  groups: StudioAttentionGroup[],
  todayActions: StudioTodayAction[]
): StudioAttentionGroup[] {
  const todayIds = new Set(todayActions.map((action) => action.id));

  return groups.filter((group) => {
    const linkedTodayId = ATTENTION_TODAY_OVERLAP[group.id];
    return !linkedTodayId || !todayIds.has(linkedTodayId);
  });
}
