import {
  boolean,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar
} from "drizzle-orm/pg-core";
import { profilesFoundation } from "@/lib/db/schema/foundation";
import { storiesContentOrigin } from "@/lib/db/schema/content-origin";

/** YouTube embed target: single video or playlist (official iframe only). */
export const FILM_YOUTUBE_EMBED_TYPES = ["video", "playlist"] as const;
export type FilmYoutubeEmbedType = (typeof FILM_YOUTUBE_EMBED_TYPES)[number];

export const FILM_RELATION_TYPES = [
  "based_on_story",
  "inspired_by_story",
  "official_adaptation",
  "fan_adaptation",
  "trailer",
  "short_film",
  "animation",
  "cinematic_scene"
] as const;
export type FilmRelationType = (typeof FILM_RELATION_TYPES)[number];

export const FILM_ADAPTATION_STATUSES = [
  "draft",
  "pending_review",
  "published",
  "hidden",
  "rejected",
  "copyright_disputed",
  "unavailable"
] as const;
export type FilmAdaptationStatus = (typeof FILM_ADAPTATION_STATUSES)[number];

export const FILM_RIGHTS_STATUSES = [
  "self_declared",
  "verified",
  "disputed",
  "rejected",
  "pending_review"
] as const;
export type FilmRightsStatus = (typeof FILM_RIGHTS_STATUSES)[number];

export const FILM_ADS_POLICIES = [
  "inherit",
  "ads_allowed",
  "ads_disabled",
  "pending_review"
] as const;
export type FilmAdsPolicy = (typeof FILM_ADS_POLICIES)[number];

export const FILM_LINK_CHECK_STATUSES = ["ok", "failed", "unknown"] as const;
export type FilmLinkCheckStatus = (typeof FILM_LINK_CHECK_STATUSES)[number];

/**
 * Story-level YouTube film adaptations. No chapter_id — story bridge only.
 * MVP: is_free is always true (enforced by DB check).
 */
export const storyFilmAdaptations = pgTable(
  "story_film_adaptations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    storyId: uuid("story_id")
      .notNull()
      .references(() => storiesContentOrigin.id, { onDelete: "cascade" }),
    creatorProfileId: uuid("creator_profile_id")
      .notNull()
      .references(() => profilesFoundation.id, { onDelete: "restrict" }),
    youtubeUrl: text("youtube_url").notNull(),
    youtubeVideoId: text("youtube_video_id"),
    youtubePlaylistId: text("youtube_playlist_id"),
    youtubeEmbedType: varchar("youtube_embed_type", { length: 32 })
      .notNull()
      .default("video"),
    title: text("title").notNull(),
    description: text("description"),
    creativeNote: text("creative_note"),
    relationType: varchar("relation_type", { length: 64 })
      .notNull()
      .default("based_on_story"),
    language: text("language").notNull().default("vi"),
    durationSeconds: integer("duration_seconds"),
    sortOrder: integer("sort_order").notNull().default(0),
    status: varchar("status", { length: 32 }).notNull().default("draft"),
    rightsStatus: varchar("rights_status", { length: 32 })
      .notNull()
      .default("self_declared"),
    adsPolicy: varchar("ads_policy", { length: 32 }).notNull().default("inherit"),
    isFree: boolean("is_free").notNull().default(true),
    lastCheckedAt: timestamp("last_checked_at", { withTimezone: true }),
    lastCheckStatus: varchar("last_check_status", { length: 16 }),
    lastCheckError: text("last_check_error"),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    storyIdIdx: index("story_film_adaptations_story_id_idx").on(table.storyId),
    creatorProfileIdIdx: index("story_film_adaptations_creator_profile_id_idx").on(
      table.creatorProfileId
    ),
    youtubeVideoIdIdx: index("story_film_adaptations_youtube_video_id_idx").on(
      table.youtubeVideoId
    ),
    youtubePlaylistIdIdx: index("story_film_adaptations_youtube_playlist_id_idx").on(
      table.youtubePlaylistId
    ),
    youtubeEmbedTypeIdx: index("story_film_adaptations_youtube_embed_type_idx").on(
      table.youtubeEmbedType
    ),
    statusIdx: index("story_film_adaptations_status_idx").on(table.status),
    rightsStatusIdx: index("story_film_adaptations_rights_status_idx").on(table.rightsStatus),
    adsPolicyIdx: index("story_film_adaptations_ads_policy_idx").on(table.adsPolicy),
    relationTypeIdx: index("story_film_adaptations_relation_type_idx").on(table.relationType),
    sortOrderIdx: index("story_film_adaptations_sort_order_idx").on(table.sortOrder)
  })
);
