import type {

  CommunitySyncSettings,

  NotifyGroupMembersDefault

} from "@/types/story-community-sync";



export const COMMUNITY_SYNC_SETTING_KEYS = {

  autoCreateStoryGroup: "auto_create_story_group",

  syncChapterComments: "sync_chapter_comments",

  syncReelComments: "sync_reel_comments",

  syncAudioComments: "sync_audio_comments",

  syncAdaptationComments: "sync_adaptation_comments",

  syncReviews: "sync_reviews",

  syncAuthorReplies: "sync_author_replies",

  collapseWindowMinutes: "collapse_window_minutes",

  maxActivityItemsPerSourcePerHour: "max_activity_items_per_source_per_hour",

  minCommentLengthToSurface: "min_comment_length_to_surface",

  hideSpamFromGroup: "hide_spam_from_group",

  requireModerationForNewAccounts: "require_moderation_for_new_accounts",

  spoilerProtectionEnabled: "spoiler_protection_enabled",

  paidChapterCommentPreview: "paid_chapter_comment_preview",

  authorCanPinGroupItems: "author_can_pin_group_items",

  authorCanHideGroupItems: "author_can_hide_group_items",

  notifyGroupMembersDefault: "notify_group_members_default"

} as const;



export type CommunitySyncSettingKey =

  (typeof COMMUNITY_SYNC_SETTING_KEYS)[keyof typeof COMMUNITY_SYNC_SETTING_KEYS];



export const DEFAULT_COMMUNITY_SYNC_SETTINGS: CommunitySyncSettings = {

  autoCreateStoryGroup: true,

  syncChapterComments: true,

  syncReelComments: true,

  syncAudioComments: true,

  syncAdaptationComments: true,

  syncReviews: true,

  syncAuthorReplies: true,

  collapseWindowMinutes: 30,

  maxActivityItemsPerSourcePerHour: 5,

  minCommentLengthToSurface: 3,

  hideSpamFromGroup: true,

  requireModerationForNewAccounts: false,

  spoilerProtectionEnabled: true,

  paidChapterCommentPreview: 80,

  authorCanPinGroupItems: false,

  authorCanHideGroupItems: true,

  notifyGroupMembersDefault: "important_only"

};



export function parseBoolean(value: unknown, fallback: boolean) {

  if (typeof value === "boolean") {

    return value;

  }



  if (value === "true" || value === true) {

    return true;

  }



  if (value === "false" || value === false) {

    return false;

  }



  return fallback;

}



export function parseNumber(value: unknown, fallback: number) {

  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : fallback;

}



export function parseNotifyDefault(value: unknown): NotifyGroupMembersDefault {

  if (value === "all" || value === "important_only" || value === "none") {

    return value;

  }



  if (typeof value === "string") {

    const normalized = value.replace(/^"|"$/g, "");

    if (

      normalized === "all" ||

      normalized === "important_only" ||

      normalized === "none"

    ) {

      return normalized;

    }

  }



  return DEFAULT_COMMUNITY_SYNC_SETTINGS.notifyGroupMembersDefault;

}



export function mergeCommunitySyncSettings(

  rows: Array<{ key: string; valueJson: unknown }>

): CommunitySyncSettings {

  const map = new Map(rows.map((row) => [row.key, row.valueJson]));

  const defaults = DEFAULT_COMMUNITY_SYNC_SETTINGS;



  return {

    autoCreateStoryGroup: parseBoolean(

      map.get(COMMUNITY_SYNC_SETTING_KEYS.autoCreateStoryGroup),

      defaults.autoCreateStoryGroup

    ),

    syncChapterComments: parseBoolean(

      map.get(COMMUNITY_SYNC_SETTING_KEYS.syncChapterComments),

      defaults.syncChapterComments

    ),

    syncReelComments: parseBoolean(

      map.get(COMMUNITY_SYNC_SETTING_KEYS.syncReelComments),

      defaults.syncReelComments

    ),

    syncAudioComments: parseBoolean(

      map.get(COMMUNITY_SYNC_SETTING_KEYS.syncAudioComments),

      defaults.syncAudioComments

    ),

    syncAdaptationComments: parseBoolean(

      map.get(COMMUNITY_SYNC_SETTING_KEYS.syncAdaptationComments),

      defaults.syncAdaptationComments

    ),

    syncReviews: parseBoolean(

      map.get(COMMUNITY_SYNC_SETTING_KEYS.syncReviews),

      defaults.syncReviews

    ),

    syncAuthorReplies: parseBoolean(

      map.get(COMMUNITY_SYNC_SETTING_KEYS.syncAuthorReplies),

      defaults.syncAuthorReplies

    ),

    collapseWindowMinutes: parseNumber(

      map.get(COMMUNITY_SYNC_SETTING_KEYS.collapseWindowMinutes),

      defaults.collapseWindowMinutes

    ),

    maxActivityItemsPerSourcePerHour: parseNumber(

      map.get(COMMUNITY_SYNC_SETTING_KEYS.maxActivityItemsPerSourcePerHour),

      defaults.maxActivityItemsPerSourcePerHour

    ),

    minCommentLengthToSurface: parseNumber(

      map.get(COMMUNITY_SYNC_SETTING_KEYS.minCommentLengthToSurface),

      defaults.minCommentLengthToSurface

    ),

    hideSpamFromGroup: parseBoolean(

      map.get(COMMUNITY_SYNC_SETTING_KEYS.hideSpamFromGroup),

      defaults.hideSpamFromGroup

    ),

    requireModerationForNewAccounts: parseBoolean(

      map.get(COMMUNITY_SYNC_SETTING_KEYS.requireModerationForNewAccounts),

      defaults.requireModerationForNewAccounts

    ),

    spoilerProtectionEnabled: parseBoolean(

      map.get(COMMUNITY_SYNC_SETTING_KEYS.spoilerProtectionEnabled),

      defaults.spoilerProtectionEnabled

    ),

    paidChapterCommentPreview: parseNumber(

      map.get(COMMUNITY_SYNC_SETTING_KEYS.paidChapterCommentPreview),

      defaults.paidChapterCommentPreview

    ),

    authorCanPinGroupItems: parseBoolean(

      map.get(COMMUNITY_SYNC_SETTING_KEYS.authorCanPinGroupItems),

      defaults.authorCanPinGroupItems

    ),

    authorCanHideGroupItems: parseBoolean(

      map.get(COMMUNITY_SYNC_SETTING_KEYS.authorCanHideGroupItems),

      defaults.authorCanHideGroupItems

    ),

    notifyGroupMembersDefault: parseNotifyDefault(

      map.get(COMMUNITY_SYNC_SETTING_KEYS.notifyGroupMembersDefault)

    )

  };

}



/** Map camelCase settings object to DB rows for upsert. */

export function communitySyncSettingsToRows(

  settings: CommunitySyncSettings

): Array<{ key: CommunitySyncSettingKey; valueJson: unknown }> {

  return [

    {

      key: COMMUNITY_SYNC_SETTING_KEYS.autoCreateStoryGroup,

      valueJson: settings.autoCreateStoryGroup

    },

    {

      key: COMMUNITY_SYNC_SETTING_KEYS.syncChapterComments,

      valueJson: settings.syncChapterComments

    },

    {

      key: COMMUNITY_SYNC_SETTING_KEYS.syncReelComments,

      valueJson: settings.syncReelComments

    },

    {

      key: COMMUNITY_SYNC_SETTING_KEYS.syncAudioComments,

      valueJson: settings.syncAudioComments

    },

    {

      key: COMMUNITY_SYNC_SETTING_KEYS.syncAdaptationComments,

      valueJson: settings.syncAdaptationComments

    },

    { key: COMMUNITY_SYNC_SETTING_KEYS.syncReviews, valueJson: settings.syncReviews },

    {

      key: COMMUNITY_SYNC_SETTING_KEYS.syncAuthorReplies,

      valueJson: settings.syncAuthorReplies

    },

    {

      key: COMMUNITY_SYNC_SETTING_KEYS.collapseWindowMinutes,

      valueJson: settings.collapseWindowMinutes

    },

    {

      key: COMMUNITY_SYNC_SETTING_KEYS.maxActivityItemsPerSourcePerHour,

      valueJson: settings.maxActivityItemsPerSourcePerHour

    },

    {

      key: COMMUNITY_SYNC_SETTING_KEYS.minCommentLengthToSurface,

      valueJson: settings.minCommentLengthToSurface

    },

    {

      key: COMMUNITY_SYNC_SETTING_KEYS.hideSpamFromGroup,

      valueJson: settings.hideSpamFromGroup

    },

    {

      key: COMMUNITY_SYNC_SETTING_KEYS.requireModerationForNewAccounts,

      valueJson: settings.requireModerationForNewAccounts

    },

    {

      key: COMMUNITY_SYNC_SETTING_KEYS.spoilerProtectionEnabled,

      valueJson: settings.spoilerProtectionEnabled

    },

    {

      key: COMMUNITY_SYNC_SETTING_KEYS.paidChapterCommentPreview,

      valueJson: settings.paidChapterCommentPreview

    },

    {

      key: COMMUNITY_SYNC_SETTING_KEYS.authorCanPinGroupItems,

      valueJson: settings.authorCanPinGroupItems

    },

    {

      key: COMMUNITY_SYNC_SETTING_KEYS.authorCanHideGroupItems,

      valueJson: settings.authorCanHideGroupItems

    },

    {

      key: COMMUNITY_SYNC_SETTING_KEYS.notifyGroupMembersDefault,

      valueJson: settings.notifyGroupMembersDefault

    }

  ];

}


