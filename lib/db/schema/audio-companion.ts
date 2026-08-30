import {
  boolean,
  index,
  integer,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar
} from "drizzle-orm/pg-core";
import { profilesFoundation } from "@/lib/db/schema/foundation";
import { storiesContentOrigin } from "@/lib/db/schema/content-origin";

export const audioSourceTypeEnum = pgEnum("audio_source_type", [
  "external_audio_url",
  "youtube_embed"
]);

export const audioItemStatusEnum = pgEnum("audio_item_status", [
  "draft",
  "pending_review",
  "published",
  "hidden",
  "broken",
  "rejected",
  "copyright_disputed"
]);

export const audioRightsStatusEnum = pgEnum("audio_rights_status", [
  "self_declared",
  "verified",
  "disputed",
  "rejected",
  "pending_review"
]);

export const audioAdsPolicyEnum = pgEnum("audio_ads_policy", [
  "inherit",
  "ads_allowed",
  "ads_disabled",
  "pending_review"
]);

export const audioLinkCheckStatusEnum = pgEnum("audio_link_check_status", ["ok", "failed", "unknown"]);

export const audioItems = pgTable(
  "audio_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    storyId: uuid("story_id")
      .notNull()
      .references(() => storiesContentOrigin.id, { onDelete: "cascade" }),
    creatorProfileId: uuid("creator_profile_id")
      .notNull()
      .references(() => profilesFoundation.id, { onDelete: "restrict" }),
    audioSourceType: audioSourceTypeEnum("audio_source_type").notNull(),
    externalAudioUrl: text("external_audio_url"),
    normalizedExternalAudioUrl: text("normalized_external_audio_url"),
    youtubeVideoId: text("youtube_video_id"),
    youtubeUrl: text("youtube_url"),
    providerName: text("provider_name"),
    title: text("title").notNull(),
    description: text("description"),
    partNumber: integer("part_number"),
    durationSeconds: integer("duration_seconds"),
    language: text("language").notNull().default("vi"),
    sortOrder: integer("sort_order").notNull().default(0),
    status: audioItemStatusEnum("status").notNull().default("draft"),
    rightsStatus: audioRightsStatusEnum("rights_status").notNull().default("self_declared"),
    adsPolicy: audioAdsPolicyEnum("ads_policy").notNull().default("inherit"),
    isFree: boolean("is_free").notNull().default(true),
    isPrimary: boolean("is_primary").notNull().default(false),
    backgroundPlaybackAllowed: boolean("background_playback_allowed").notNull().default(false),
    continuousPlaybackAllowed: boolean("continuous_playback_allowed").notNull().default(false),
    lastCheckedAt: timestamp("last_checked_at", { withTimezone: true }),
    lastCheckStatus: audioLinkCheckStatusEnum("last_check_status"),
    lastCheckError: text("last_check_error"),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    storyIdIdx: index("audio_items_story_id_idx").on(table.storyId),
    creatorProfileIdIdx: index("audio_items_creator_profile_id_idx").on(table.creatorProfileId),
    sourceTypeIdx: index("audio_items_source_type_idx").on(table.audioSourceType),
    statusIdx: index("audio_items_status_idx").on(table.status),
    rightsStatusIdx: index("audio_items_rights_status_idx").on(table.rightsStatus),
    adsPolicyIdx: index("audio_items_ads_policy_idx").on(table.adsPolicy),
    partNumberIdx: index("audio_items_part_number_idx").on(table.partNumber),
    sortOrderIdx: index("audio_items_sort_order_idx").on(table.sortOrder)
  })
);

export const audioListeningProgress = pgTable(
  "audio_listening_progress",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    profileId: uuid("profile_id").references(() => profilesFoundation.id, { onDelete: "cascade" }),
    anonymousClientId: text("anonymous_client_id"),
    storyId: uuid("story_id")
      .notNull()
      .references(() => storiesContentOrigin.id, { onDelete: "cascade" }),
    audioItemId: uuid("audio_item_id")
      .notNull()
      .references(() => audioItems.id, { onDelete: "cascade" }),
    currentTimeSeconds: integer("current_time_seconds").notNull().default(0),
    durationSeconds: integer("duration_seconds"),
    playbackRate: numeric("playback_rate", { precision: 4, scale: 2 }).notNull().default("1"),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    lastPlayedAt: timestamp("last_played_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    profileIdIdx: index("audio_progress_profile_id_idx").on(table.profileId),
    anonymousClientIdIdx: index("audio_progress_anonymous_client_id_idx").on(table.anonymousClientId),
    storyIdIdx: index("audio_progress_story_id_idx").on(table.storyId),
    audioItemIdIdx: index("audio_progress_audio_item_id_idx").on(table.audioItemId),
    lastPlayedAtIdx: index("audio_progress_last_played_at_idx").on(table.lastPlayedAt)
  })
);
