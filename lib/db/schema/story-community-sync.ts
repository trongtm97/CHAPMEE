import {
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar
} from "drizzle-orm/pg-core";

export const storyGroups = pgTable(
  "story_groups",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    storyId: uuid("story_id").notNull(),
    groupSlug: varchar("group_slug", { length: 160 }).notNull(),
    title: text("title").notNull(),
    description: text("description"),
    visibility: varchar("visibility", { length: 32 }).notNull().default("public"),
    memberCount: integer("member_count").notNull().default(0),
    activityCount: integer("activity_count").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    storyIdUnique: uniqueIndex("story_groups_story_id_unique").on(table.storyId),
    storyIdIdx: index("story_groups_story_id_idx").on(table.storyId),
    groupSlugIdx: index("story_groups_group_slug_idx").on(table.groupSlug)
  })
);

export const interactionEvents = pgTable(
  "interaction_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    actorUserId: uuid("actor_user_id"),
    storyId: uuid("story_id").notNull(),
    groupId: uuid("group_id").notNull(),
    eventType: varchar("event_type", { length: 64 }).notNull(),
    sourceEntityType: varchar("source_entity_type", { length: 64 }).notNull(),
    sourceEntityId: uuid("source_entity_id").notNull(),
    sourceUrl: text("source_url"),
    targetUrl: text("target_url"),
    sourceCommentId: uuid("source_comment_id"),
    parentCommentId: uuid("parent_comment_id"),
    metadataJson: jsonb("metadata_json").notNull().default({}),
    moderationStatus: varchar("moderation_status", { length: 32 })
      .notNull()
      .default("approved"),
    spoilerLevel: varchar("spoiler_level", { length: 32 }).notNull().default("none"),
    sourceChapterOrder: integer("source_chapter_order"),
    idempotencyKey: text("idempotency_key").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    idempotencyKeyUnique: uniqueIndex("interaction_events_idempotency_key_unique").on(
      table.idempotencyKey
    ),
    storyCreatedIdx: index("interaction_events_story_id_created_at_idx").on(
      table.storyId,
      table.createdAt
    ),
    groupCreatedIdx: index("interaction_events_group_id_created_at_idx").on(
      table.groupId,
      table.createdAt
    )
  })
);

export const groupFeedItems = pgTable(
  "group_feed_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    groupId: uuid("group_id").notNull(),
    storyId: uuid("story_id").notNull(),
    itemType: varchar("item_type", { length: 64 }).notNull(),
    sourceEventId: uuid("source_event_id"),
    sourceCommentId: uuid("source_comment_id"),
    title: text("title"),
    excerpt: text("excerpt"),
    targetUrl: text("target_url"),
    sourceEntityType: varchar("source_entity_type", { length: 64 }).notNull(),
    sourceEntityId: uuid("source_entity_id").notNull(),
    score: numeric("score", { precision: 10, scale: 2 }).notNull().default("0"),
    visibility: varchar("visibility", { length: 32 }).notNull().default("visible"),
    moderationStatus: varchar("moderation_status", { length: 32 })
      .notNull()
      .default("approved"),
    spoilerLevel: varchar("spoiler_level", { length: 32 }).notNull().default("none"),
    sourceChapterOrder: integer("source_chapter_order"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    groupSourceUnique: uniqueIndex("group_feed_items_group_source_unique").on(
      table.groupId,
      table.sourceEntityType,
      table.sourceEntityId,
      table.itemType
    ),
    groupCreatedIdx: index("group_feed_items_group_id_created_at_idx").on(
      table.groupId,
      table.createdAt
    ),
    storyCreatedIdx: index("group_feed_items_story_id_created_at_idx").on(
      table.storyId,
      table.createdAt
    ),
    visibilityModerationIdx: index("group_feed_items_visibility_moderation_idx").on(
      table.visibility,
      table.moderationStatus
    )
  })
);

export const communitySyncSettings = pgTable("community_sync_settings", {
  key: text("key").primaryKey(),
  valueJson: jsonb("value_json").notNull().default({}),
  updatedBy: uuid("updated_by"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
});
