import {
  integer,
  numeric,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar
} from "drizzle-orm/pg-core";

export const storyReviews = pgTable("story_reviews", {
  id: uuid("id").primaryKey().defaultRandom(),
  storyId: uuid("story_id").notNull(),
  reviewerProfileId: uuid("reviewer_profile_id").notNull(),
  overallRating: integer("overall_rating").notNull(),
  plotScore: integer("plot_score").notNull(),
  characterScore: integer("character_score").notNull(),
  writingStyleScore: integer("writing_style_score").notNull(),
  worldbuildingScore: integer("worldbuilding_score").notNull(),
  title: text("title"),
  body: text("body"),
  status: varchar("status", { length: 32 }).notNull().default("visible"),
  reportCount: integer("report_count").notNull().default(0),
  helpfulCount: integer("helpful_count").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
});

export const storyReviewStats = pgTable("story_review_stats", {
  storyId: uuid("story_id").primaryKey(),
  reviewCount: integer("review_count").notNull().default(0),
  avgOverall: numeric("avg_overall", { precision: 4, scale: 2 }),
  avgPlot: numeric("avg_plot", { precision: 4, scale: 2 }),
  avgCharacter: numeric("avg_character", { precision: 4, scale: 2 }),
  avgWritingStyle: numeric("avg_writing_style", { precision: 4, scale: 2 }),
  avgWorldbuilding: numeric("avg_worldbuilding", { precision: 4, scale: 2 }),
  rating1Count: integer("rating_1_count").notNull().default(0),
  rating2Count: integer("rating_2_count").notNull().default(0),
  rating3Count: integer("rating_3_count").notNull().default(0),
  rating4Count: integer("rating_4_count").notNull().default(0),
  rating5Count: integer("rating_5_count").notNull().default(0),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
});
