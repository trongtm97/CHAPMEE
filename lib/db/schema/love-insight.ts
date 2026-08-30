import {
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp
} from "drizzle-orm/pg-core";

export const loveReadingTypeEnum = pgEnum("love_reading_type", ["NAME_ONLY", "NAME_DOB"]);

export const lovePrivacyModeEnum = pgEnum("love_privacy_mode", [
  "FULL_NAMES",
  "INITIALS",
  "HIDDEN"
]);

export const loveElementEnum = pgEnum("love_element", [
  "WOOD",
  "FIRE",
  "EARTH",
  "METAL",
  "WATER",
  "UNKNOWN"
]);

export const loveGenderCommonEnum = pgEnum("love_gender_common", [
  "MALE",
  "FEMALE",
  "UNISEX",
  "UNKNOWN"
]);

export const loveReadings = pgTable(
  "love_readings",
  {
    id: text("id").primaryKey(),
    inputHash: text("input_hash").notNull().unique(),
    shareId: text("share_id").notNull().unique(),
    readingType: loveReadingTypeEnum("reading_type").notNull(),
    personAName: text("person_a_name").notNull(),
    personBName: text("person_b_name").notNull(),
    personAInitial: text("person_a_initial").notNull(),
    personBInitial: text("person_b_initial").notNull(),
    personADob: timestamp("person_a_dob", { withTimezone: true }),
    personBDob: timestamp("person_b_dob", { withTimezone: true }),
    relationshipStatus: text("relationship_status"),
    privacyMode: lovePrivacyModeEnum("privacy_mode").notNull(),
    totalScore: integer("total_score").notNull(),
    levelLabel: text("level_label").notNull(),
    subscores: jsonb("subscores").notNull(),
    modules: jsonb("modules").notNull(),
    reasonCodes: jsonb("reason_codes").notNull(),
    summary: text("summary").notNull(),
    trustExplanation: text("trust_explanation").notNull(),
    calculationBreakdown: jsonb("calculation_breakdown").notNull(),
    personalizedInsights: jsonb("personalized_insights").notNull(),
    strengths: jsonb("strengths").notNull(),
    risks: jsonb("risks").notNull(),
    advice: jsonb("advice").notNull(),
    adHints: jsonb("ad_hints"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    readingTypeCreatedIdx: index("love_readings_type_created_idx").on(
      table.readingType,
      table.createdAt
    ),
    createdAtIdx: index("love_readings_created_at_idx").on(table.createdAt)
  })
);

export const loveVietnameseNames = pgTable(
  "love_vietnamese_names",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    normalizedName: text("normalized_name").notNull().unique(),
    meaning: text("meaning").notNull(),
    semanticTags: jsonb("semantic_tags").notNull(),
    symbolicElement: loveElementEnum("symbolic_element").notNull(),
    loveStyle: text("love_style").notNull(),
    strengths: text("strengths").notNull(),
    risks: text("risks").notNull(),
    advice: text("advice").notNull(),
    genderCommon: loveGenderCommonEnum("gender_common").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    genderIdx: index("love_vietnamese_names_gender_idx").on(table.genderCommon)
  })
);

export type LoveReadingRow = typeof loveReadings.$inferSelect;
export type LoveReadingInsert = typeof loveReadings.$inferInsert;
export type LoveVietnameseNameRow = typeof loveVietnameseNames.$inferSelect;
