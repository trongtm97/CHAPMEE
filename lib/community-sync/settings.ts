import type { CommunitySyncSettings, NotifyGroupMembersDefault } from "@/types/story-community-sync";
import {
  COMMUNITY_SYNC_SETTING_KEYS,
  DEFAULT_COMMUNITY_SYNC_SETTINGS
} from "@/lib/community-sync/sync-settings-defaults";

export type CommunitySyncSettingFieldType = "boolean" | "number" | "notify";

export type CommunitySyncSettingDefinition = {
  key: keyof CommunitySyncSettings;
  dbKey: string;
  label: string;
  description: string;
  type: CommunitySyncSettingFieldType;
  min?: number;
  max?: number;
  section: "sync" | "thresholds" | "moderation" | "author" | "notifications";
};

export const COMMUNITY_SYNC_SETTING_DEFINITIONS: CommunitySyncSettingDefinition[] = [
  {
    key: "autoCreateStoryGroup",
    dbKey: COMMUNITY_SYNC_SETTING_KEYS.autoCreateStoryGroup,
    label: "Tự tạo nhóm truyện",
    description: "Tự tạo story_groups khi có tương tác đầu tiên trên truyện đã publish.",
    type: "boolean",
    section: "sync"
  },
  {
    key: "syncChapterComments",
    dbKey: COMMUNITY_SYNC_SETTING_KEYS.syncChapterComments,
    label: "Đồng bộ bình luận chương",
    description: "Đẩy bình luận chương vào feed hoạt động nhóm truyện.",
    type: "boolean",
    section: "sync"
  },
  {
    key: "syncReelComments",
    dbKey: COMMUNITY_SYNC_SETTING_KEYS.syncReelComments,
    label: "Đồng bộ bình luận Reels",
    description: "Đồng bộ tương tác từ Reels liên quan truyện.",
    type: "boolean",
    section: "sync"
  },
  {
    key: "syncAudioComments",
    dbKey: COMMUNITY_SYNC_SETTING_KEYS.syncAudioComments,
    label: "Đồng bộ bình luận Audio",
    description: "Đồng bộ tương tác audio khi module bình luận audio được bật.",
    type: "boolean",
    section: "sync"
  },
  {
    key: "syncAdaptationComments",
    dbKey: COMMUNITY_SYNC_SETTING_KEYS.syncAdaptationComments,
    label: "Đồng bộ bình luận phim/chuyển thể",
    description: "Đồng bộ tương tác phim chuyển thể liên quan truyện.",
    type: "boolean",
    section: "sync"
  },
  {
    key: "syncReviews",
    dbKey: COMMUNITY_SYNC_SETTING_KEYS.syncReviews,
    label: "Đồng bộ review truyện",
    description: "Đẩy review truyện vào feed nhóm (khi hook review sync được kết nối).",
    type: "boolean",
    section: "sync"
  },
  {
    key: "syncAuthorReplies",
    dbKey: COMMUNITY_SYNC_SETTING_KEYS.syncAuthorReplies,
    label: "Đồng bộ trả lời tác giả",
    description: "Luôn surface reply từ tác giả truyện trong feed nhóm.",
    type: "boolean",
    section: "sync"
  },
  {
    key: "collapseWindowMinutes",
    dbKey: COMMUNITY_SYNC_SETTING_KEYS.collapseWindowMinutes,
    label: "Cửa sổ gom hoạt động (phút)",
    description: "Trong khoảng thời gian này, nhiều bình luận cùng nguồn có thể gom thành 1 item.",
    type: "number",
    min: 5,
    max: 240,
    section: "thresholds"
  },
  {
    key: "maxActivityItemsPerSourcePerHour",
    dbKey: COMMUNITY_SYNC_SETTING_KEYS.maxActivityItemsPerSourcePerHour,
    label: "Tối đa item/nguồn trong cửa sổ",
    description: "Vượt ngưỡng sẽ chuyển sang aggregated activity thay vì từng item riêng.",
    type: "number",
    min: 1,
    max: 50,
    section: "thresholds"
  },
  {
    key: "minCommentLengthToSurface",
    dbKey: COMMUNITY_SYNC_SETTING_KEYS.minCommentLengthToSurface,
    label: "Độ dài bình luận tối thiểu",
    description: "Bình luận ngắn hơn ngưỡng sẽ không xuất hiện trong feed nhóm.",
    type: "number",
    min: 0,
    max: 100,
    section: "thresholds"
  },
  {
    key: "hideSpamFromGroup",
    dbKey: COMMUNITY_SYNC_SETTING_KEYS.hideSpamFromGroup,
    label: "Ẩn spam khỏi feed nhóm",
    description: "Không đồng bộ bình luận bị đánh dấu spam hoặc flagged.",
    type: "boolean",
    section: "moderation"
  },
  {
    key: "requireModerationForNewAccounts",
    dbKey: COMMUNITY_SYNC_SETTING_KEYS.requireModerationForNewAccounts,
    label: "Chờ duyệt tài khoản mới",
    description: "Tài khoản < 3 ngày chỉ sync khi moderation đã approved.",
    type: "boolean",
    section: "moderation"
  },
  {
    key: "spoilerProtectionEnabled",
    dbKey: COMMUNITY_SYNC_SETTING_KEYS.spoilerProtectionEnabled,
    label: "Bảo vệ spoiler",
    description: "Bật logic che spoiler trên feed nhóm (UI + metadata spoiler_level).",
    type: "boolean",
    section: "moderation"
  },
  {
    key: "paidChapterCommentPreview",
    dbKey: COMMUNITY_SYNC_SETTING_KEYS.paidChapterCommentPreview,
    label: "Preview bình luận chương trả phí",
    description: "Giới hạn ký tự excerpt cho bình luận ở chương trả phí trong feed.",
    type: "number",
    min: 20,
    max: 200,
    section: "moderation"
  },
  {
    key: "authorCanPinGroupItems",
    dbKey: COMMUNITY_SYNC_SETTING_KEYS.authorCanPinGroupItems,
    label: "Tác giả được ghim item",
    description: "Cho phép tác giả ghim hoạt động trong nhóm truyện (UI tác giả sẽ dùng sau).",
    type: "boolean",
    section: "author"
  },
  {
    key: "authorCanHideGroupItems",
    dbKey: COMMUNITY_SYNC_SETTING_KEYS.authorCanHideGroupItems,
    label: "Tác giả được ẩn item",
    description: "Cho phép tác giả ẩn hoạt động không phù hợp trong nhóm truyện.",
    type: "boolean",
    section: "author"
  },
  {
    key: "notifyGroupMembersDefault",
    dbKey: COMMUNITY_SYNC_SETTING_KEYS.notifyGroupMembersDefault,
    label: "Thông báo thành viên mặc định",
    description: "Chính sách thông báo mặc định khi có hoạt động mới trong nhóm.",
    type: "notify",
    section: "notifications"
  }
];

export const COMMUNITY_SYNC_SETTING_SECTIONS: Array<{
  id: CommunitySyncSettingDefinition["section"];
  label: string;
}> = [
  { id: "sync", label: "Đồng bộ nguồn" },
  { id: "thresholds", label: "Ngưỡng & gom hoạt động" },
  { id: "moderation", label: "Kiểm duyệt & spoiler" },
  { id: "author", label: "Quyền tác giả" },
  { id: "notifications", label: "Thông báo" }
];

export function clampCommunitySyncSettings(
  settings: CommunitySyncSettings
): CommunitySyncSettings {
  const clamp = (value: number, min: number, max: number) =>
    Math.min(max, Math.max(min, value));

  return {
    ...settings,
    collapseWindowMinutes: clamp(settings.collapseWindowMinutes, 5, 240),
    maxActivityItemsPerSourcePerHour: clamp(
      settings.maxActivityItemsPerSourcePerHour,
      1,
      50
    ),
    minCommentLengthToSurface: clamp(settings.minCommentLengthToSurface, 0, 100),
    paidChapterCommentPreview: clamp(settings.paidChapterCommentPreview, 20, 200),
    notifyGroupMembersDefault: (
      ["all", "important_only", "none"] as NotifyGroupMembersDefault[]
    ).includes(settings.notifyGroupMembersDefault)
      ? settings.notifyGroupMembersDefault
      : DEFAULT_COMMUNITY_SYNC_SETTINGS.notifyGroupMembersDefault
  };
}

export {
  COMMUNITY_SYNC_SETTING_KEYS,
  DEFAULT_COMMUNITY_SYNC_SETTINGS,
  mergeCommunitySyncSettings,
  communitySyncSettingsToRows
} from "@/lib/community-sync/sync-settings-defaults";
