/** Controlled taxonomy groups for ChapMee stories and platform metadata. */
export const TAXONOMY_TYPES = [
  "content_type",
  "main_genre",
  "subgenre",
  "trope_tag",
  "setting_tag",
  "character_tag",
  "relationship_tag",
  "narrative_style",
  "presentation_mode",
  "reader_experience",
  "content_warning",
  "age_rating",
  "story_status",
  "monetization_access",
  "editorial_tag"
] as const;

export type TaxonomyType = (typeof TAXONOMY_TYPES)[number];

export type TaxonomyRequestStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "merged";

export type TaxonomyTermRow = {
  id: string;
  type: TaxonomyType;
  parent_id: string | null;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  color: string | null;
  display_label: string | null;
  internal_note: string | null;
  aliases: string[];
  is_active: boolean;
  is_public: boolean;
  is_selectable_by_creator: boolean;
  is_featured: boolean;
  use_for_seo: boolean;
  use_for_discover: boolean;
  use_for_ranking: boolean;
  use_for_moderation: boolean;
  seo_title: string | null;
  seo_description: string | null;
  seo_h1: string | null;
  seo_intro: string | null;
  canonical_path: string | null;
  seo_indexable: boolean;
  sitemap_priority: number | null;
  sitemap_changefreq: string | null;
  og_image_url: string | null;
  /** Prefer storage_assets id over og_image_url. */
  og_image_asset_id?: string | null;
  use_for_pinterest_feed: boolean;
  min_stories_override: number | null;
  sort_order: number;
  usage_count: number;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
};

/** Public-safe projection (no internal_note). */
export type TaxonomyTerm = Omit<TaxonomyTermRow, "internal_note">;

export type TaxonomyTermTreeNode = TaxonomyTerm & {
  children: TaxonomyTermTreeNode[];
};

export type StoryTaxonomyTermLink = {
  id: string;
  story_id: string;
  term_id: string;
  type: TaxonomyType;
  created_at: string;
  term?: TaxonomyTerm;
};

export type StoryTaxonomyByType = Partial<Record<TaxonomyType, TaxonomyTerm[]>>;

export type TaxonomyRequestRow = {
  id: string;
  requested_by: string;
  type: TaxonomyType;
  name: string;
  description: string | null;
  example_usage: string | null;
  related_existing_term_id: string | null;
  status: TaxonomyRequestStatus;
  admin_note: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type StoryPresentationSettingsRow = {
  id: string;
  story_id: string;
  mode: string;
  template_id: string | null;
  settings_json: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type StoryFormatTemplateRow = {
  id: string;
  mode: string;
  name: string;
  description: string | null;
  schema_json: Record<string, unknown>;
  example_json: Record<string, unknown>;
  is_active: boolean;
  is_default: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type StoryTaxonomySelectionInput = {
  /** term id per type */
  selections?: Partial<Record<TaxonomyType, string[]>>;
  /** presentation_mode slug or term id */
  presentationMode?: string | null;
  formatTemplateId?: string | null;
  contentWarningsConfirmed?: boolean;
};

export type StoryTaxonomyValidationResult =
  | { ok: true; normalized: Partial<Record<TaxonomyType, string[]>> }
  | { ok: false; errors: string[] };
