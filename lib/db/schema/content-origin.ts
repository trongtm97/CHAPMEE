import { boolean, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const storiesContentOrigin = pgTable("stories", {
  id: uuid("id").primaryKey(),
  contentOrigin: text("content_origin").notNull().default("original"),
  translationType: text("translation_type"),
  rightsStatus: text("rights_status").notNull().default("unverified"),
  monetizationPolicy: text("monetization_policy").notNull().default("full"),
  originalLanguage: text("original_language"),
  translatedLanguage: text("translated_language"),
  sourceTitle: text("source_title"),
  sourceAuthorName: text("source_author_name"),
  sourceUrl: text("source_url"),
  sourcePlatform: text("source_platform"),
  translatorProfileId: uuid("translator_profile_id"),
  licenseNote: text("license_note"),
  licenseDocumentMediaId: uuid("license_document_media_id"),
  rightsVerifiedByAdminId: uuid("rights_verified_by_admin_id"),
  rightsVerifiedAt: timestamp("rights_verified_at", { withTimezone: true }),
  rightsExpiresAt: timestamp("rights_expires_at", { withTimezone: true }),
  rightsReviewNote: text("rights_review_note"),
  mustBeFreeToRead: boolean("must_be_free_to_read").notNull().default(false),
  canSellChapters: boolean("can_sell_chapters").notNull().default(true),
  canSellStoryBundle: boolean("can_sell_story_bundle").notNull().default(true),
  canReceiveTips: boolean("can_receive_tips").notNull().default(true),
  canShareAdsRevenue: boolean("can_share_ads_revenue").notNull().default(true),
  canJoinBoostCampaign: boolean("can_join_boost_campaign").notNull().default(true)
});

