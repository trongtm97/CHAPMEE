import {
  boolean,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar
} from "drizzle-orm/pg-core";

export const chapterReactionTypes = pgTable("chapter_reaction_types", {
  id: uuid("id").primaryKey().defaultRandom(),
  key: varchar("key", { length: 64 }).notNull().unique(),
  label: text("label").notNull(),
  emoji: text("emoji").notNull(),
  isEnabled: boolean("is_enabled").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
});

export const chapterReactions = pgTable("chapter_reactions", {
  id: uuid("id").primaryKey().defaultRandom(),
  chapterId: uuid("chapter_id").notNull(),
  profileId: uuid("profile_id").notNull(),
  reactionTypeKey: varchar("reaction_type_key", { length: 64 }).notNull(),
  origin: varchar("origin", { length: 32 }).notNull().default("user"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
});
