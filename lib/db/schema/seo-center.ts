import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar
} from "drizzle-orm/pg-core";
import { profilesFoundation } from "@/lib/db/schema/foundation";

/** Minimal FK target — full DDL lives in storage migrations / view media_assets. */
export const storageAssetsSeo = pgTable("storage_assets", {
  id: uuid("id").primaryKey()
});

export const seoSettings = pgTable("seo_settings", {
  id: uuid("id").defaultRandom().primaryKey(),
  siteName: text("site_name").notNull().default("ChapMee"),
  defaultTitleTemplate: text("default_title_template")
    .notNull()
    .default("{page_title} | ChapMee"),
  defaultDescriptionTemplate: text("default_description_template")
    .notNull()
    .default(
      "ChapMee - Nền tảng giải trí text/story dành cho người đọc và tác giả."
    ),
  defaultOgImageAssetId: uuid("default_og_image_asset_id").references(
    () => storageAssetsSeo.id,
    { onDelete: "set null" }
  ),
  titleSeparator: text("title_separator").notNull().default("|"),
  defaultRobotsIndex: boolean("default_robots_index").notNull().default(true),
  defaultRobotsFollow: boolean("default_robots_follow").notNull().default(true),
  defaultLocale: text("default_locale").notNull().default("vi"),
  sitemapEnabled: boolean("sitemap_enabled").notNull().default(true),
  robotsEnabled: boolean("robots_enabled").notNull().default(true),
  includeChapters: boolean("include_chapters").notNull().default(true),
  includeProfiles: boolean("include_profiles").notNull().default(true),
  includeMedia: boolean("include_media").notNull().default(true),
  includeArticles: boolean("include_articles").notNull().default(true),
  includeTaxonomy: boolean("include_taxonomy").notNull().default(true),
  defaultChangefreq: text("default_changefreq"),
  defaultPriority: text("default_priority"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
});

export const seoOverrides = pgTable(
  "seo_overrides",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    targetType: varchar("target_type", { length: 32 }).notNull(),
    targetId: uuid("target_id"),
    path: text("path"),
    locale: text("locale").notNull().default("vi"),
    title: text("title"),
    metaDescription: text("meta_description"),
    canonicalUrl: text("canonical_url"),
    ogTitle: text("og_title"),
    ogDescription: text("og_description"),
    ogImageAssetId: uuid("og_image_asset_id").references(() => storageAssetsSeo.id, {
      onDelete: "set null"
    }),
    twitterTitle: text("twitter_title"),
    twitterDescription: text("twitter_description"),
    twitterImageAssetId: uuid("twitter_image_asset_id").references(
      () => storageAssetsSeo.id,
      { onDelete: "set null" }
    ),
    robotsIndex: boolean("robots_index"),
    robotsFollow: boolean("robots_follow"),
    schemaType: text("schema_type"),
    extraJsonLd: jsonb("extra_json_ld"),
    isEnabled: boolean("is_enabled").notNull().default(true),
    createdBy: uuid("created_by").references(() => profilesFoundation.id, {
      onDelete: "set null"
    }),
    updatedBy: uuid("updated_by").references(() => profilesFoundation.id, {
      onDelete: "set null"
    }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    targetTypeTargetIdIdx: index("seo_overrides_target_type_target_id_idx").on(
      table.targetType,
      table.targetId
    ),
    pathIdx: index("seo_overrides_path_idx").on(table.path),
    localeIdx: index("seo_overrides_locale_idx").on(table.locale),
    isEnabledIdx: index("seo_overrides_is_enabled_idx").on(table.isEnabled)
  })
);

export const seoContentBlocks = pgTable(
  "seo_content_blocks",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    pageType: text("page_type").notNull(),
    targetType: varchar("target_type", { length: 32 }),
    targetId: uuid("target_id"),
    routePath: text("route_path"),
    locale: text("locale").notNull().default("vi"),
    title: text("title").notNull(),
    summary: text("summary"),
    contentMarkdown: text("content_markdown").notNull(),
    faqJson: jsonb("faq_json"),
    internalLinksJson: jsonb("internal_links_json"),
    placement: text("placement").notNull().default("before_footer"),
    isCollapsible: boolean("is_collapsible").notNull().default(true),
    status: varchar("status", { length: 16 }).notNull().default("draft"),
    createdBy: uuid("created_by").references(() => profilesFoundation.id, {
      onDelete: "set null"
    }),
    updatedBy: uuid("updated_by").references(() => profilesFoundation.id, {
      onDelete: "set null"
    }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    publishedAt: timestamp("published_at", { withTimezone: true })
  },
  (table) => ({
    routePathIdx: index("seo_content_blocks_route_path_idx").on(table.routePath),
    pageTypeIdx: index("seo_content_blocks_page_type_idx").on(table.pageType),
    targetTypeTargetIdIdx: index("seo_content_blocks_target_type_target_id_idx").on(
      table.targetType,
      table.targetId
    ),
    statusIdx: index("seo_content_blocks_status_idx").on(table.status),
    localeIdx: index("seo_content_blocks_locale_idx").on(table.locale)
  })
);

export const seoRedirects = pgTable(
  "seo_redirects",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    sourcePath: text("source_path").notNull(),
    destinationPath: text("destination_path").notNull(),
    statusCode: integer("status_code").notNull().default(301),
    preserveQuery: boolean("preserve_query").notNull().default(true),
    isEnabled: boolean("is_enabled").notNull().default(true),
    hitCount: integer("hit_count").notNull().default(0),
    lastHitAt: timestamp("last_hit_at", { withTimezone: true }),
    note: text("note"),
    createdBy: uuid("created_by").references(() => profilesFoundation.id, {
      onDelete: "set null"
    }),
    updatedBy: uuid("updated_by").references(() => profilesFoundation.id, {
      onDelete: "set null"
    }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    sourcePathIdx: index("seo_redirects_source_path_idx").on(table.sourcePath),
    isEnabledIdx: index("seo_redirects_is_enabled_idx").on(table.isEnabled),
    statusCodeIdx: index("seo_redirects_status_code_idx").on(table.statusCode)
  })
);

export const seo404Logs = pgTable(
  "seo_404_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    path: text("path").notNull(),
    referrer: text("referrer"),
    userAgentHash: text("user_agent_hash"),
    hitCount: integer("hit_count").notNull().default(1),
    firstSeenAt: timestamp("first_seen_at", { withTimezone: true }).notNull().defaultNow(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull().defaultNow(),
    lastIpHash: text("last_ip_hash")
  },
  (table) => ({
    pathIdx: index("seo_404_logs_path_idx").on(table.path),
    lastSeenAtIdx: index("seo_404_logs_last_seen_at_idx").on(table.lastSeenAt),
    hitCountIdx: index("seo_404_logs_hit_count_idx").on(table.hitCount)
  })
);

export const seoAuditResults = pgTable(
  "seo_audit_results",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    targetType: varchar("target_type", { length: 32 }).notNull(),
    targetId: uuid("target_id"),
    path: text("path"),
    score: integer("score"),
    issuesJson: jsonb("issues_json").notNull().default([]),
    lastCheckedAt: timestamp("last_checked_at", { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    targetTypeTargetIdIdx: index("seo_audit_results_target_type_target_id_idx").on(
      table.targetType,
      table.targetId
    ),
    pathIdx: index("seo_audit_results_path_idx").on(table.path),
    lastCheckedAtIdx: index("seo_audit_results_last_checked_at_idx").on(table.lastCheckedAt)
  })
);

export type SeoSettingsRow = typeof seoSettings.$inferSelect;
export type SeoOverrideRow = typeof seoOverrides.$inferSelect;
export type SeoContentBlockRow = typeof seoContentBlocks.$inferSelect;
export type SeoRedirectRow = typeof seoRedirects.$inferSelect;
export type Seo404LogRow = typeof seo404Logs.$inferSelect;
export type SeoAuditResultRow = typeof seoAuditResults.$inferSelect;
