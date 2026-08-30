import type { Metadata } from "next";
import type {
  SeoContentPlacement,
  SeoContentStatus,
  SeoPageType,
  SeoRedirectStatusCode,
  SeoTargetType
} from "@/lib/seo/seo-constants";
import type {
  Seo404LogRow,
  SeoAuditResultRow,
  SeoContentBlockRow,
  SeoOverrideRow,
  SeoRedirectRow,
  SeoSettingsRow
} from "@/lib/db/schema/seo-center";

export type {
  SeoTargetType,
  SeoRedirectStatusCode,
  SeoContentStatus,
  SeoPageType,
  SeoContentPlacement
} from "@/lib/seo/seo-constants";

export type {
  SeoSettingsRow,
  SeoOverrideRow,
  SeoContentBlockRow,
  SeoRedirectRow,
  Seo404LogRow,
  SeoAuditResultRow
};

/** Input for resolving public page metadata (runtime merge). */
export type SeoMetadataInput = {
  pathname: string;
  locale?: string;
  pageType?: SeoPageType;
  targetType?: SeoTargetType;
  targetId?: string | null;
  /** Base title before templates/overrides. */
  pageTitle?: string | null;
  /** Base description before templates/overrides. */
  pageDescription?: string | null;
  /** Entity-level canonical if known. */
  canonicalUrl?: string | null;
  /** Resolved media asset ids (never raw local URLs). */
  ogImageAssetId?: string | null;
  twitterImageAssetId?: string | null;
  indexableOverride?: boolean | null;
  followOverride?: boolean | null;
};

/** Resolved metadata fields after settings + override merge. */
export type SeoMetadataResult = {
  title: string;
  description: string;
  canonicalUrl?: string;
  robotsIndex: boolean;
  robotsFollow: boolean;
  ogTitle?: string;
  ogDescription?: string;
  ogImageAssetId?: string | null;
  twitterTitle?: string;
  twitterDescription?: string;
  twitterImageAssetId?: string | null;
  schemaType?: string | null;
  extraJsonLd?: Record<string, unknown> | unknown[] | null;
  /** Which layer supplied the winning values. */
  sources: {
    settings: boolean;
    override: boolean;
    input: boolean;
  };
};

export type SeoRedirectInput = {
  sourcePath: string;
  destinationPath: string;
  statusCode?: SeoRedirectStatusCode;
  preserveQuery?: boolean;
  isEnabled?: boolean;
  note?: string | null;
};

export type SeoRedirectValidationResult =
  | { ok: true; normalized: { sourcePath: string; destinationPath: string } }
  | { ok: false; error: string };

export type SeoOverrideInput = {
  targetType: SeoTargetType;
  targetId?: string | null;
  path?: string | null;
  locale?: string;
  title?: string | null;
  metaDescription?: string | null;
  canonicalUrl?: string | null;
  ogTitle?: string | null;
  ogDescription?: string | null;
  ogImageAssetId?: string | null;
  twitterTitle?: string | null;
  twitterDescription?: string | null;
  twitterImageAssetId?: string | null;
  robotsIndex?: boolean | null;
  robotsFollow?: boolean | null;
  schemaType?: string | null;
  extraJsonLd?: Record<string, unknown> | unknown[] | null;
  isEnabled?: boolean;
};

export type Seo404LogInput = {
  path: string;
  referrer?: string | null;
  userAgentHash?: string | null;
  lastIpHash?: string | null;
};

export type SeoContentFaqItem = {
  question: string;
  answer: string;
};

export type SeoContentInternalLink = {
  label: string;
  url: string;
  note?: string;
};

export type SeoAuditIssue = {
  code: string;
  severity: "info" | "warning" | "error" | "critical";
  message: string;
  metadata?: Record<string, unknown>;
};

/** Entity fields used for template interpolation and image/canonical resolution. */
export type SeoEntityData = {
  storyTitle?: string | null;
  chapterTitle?: string | null;
  chapterNumber?: number | string | null;
  authorName?: string | null;
  username?: string | null;
  genre?: string | null;
  genres?: string | null;
  chapterCount?: number | string | null;
  status?: string | null;
  contentStatus?: string | null;
  year?: number | string | null;
  page?: number | string | null;
  taxonomyName?: string | null;
  pageTitle?: string | null;
  shortDescription?: string | null;
  excerpt?: string | null;
  postTitle?: string | null;
  /** Internal canonical path e.g. /truyen/foo-s.123 or /@username */
  canonicalPath?: string | null;
  coverImageAssetId?: string | null;
  avatarImageAssetId?: string | null;
  ogImageAssetId?: string | null;
  twitterImageAssetId?: string | null;
  /** Legacy resolved cover/avatar URL — used only when asset id absent. */
  coverUrl?: string | null;
  avatarUrl?: string | null;
  keywords?: string[] | null;
};

export type ResolveSeoMetadataInput = {
  path: string;
  targetType?: SeoTargetType;
  targetId?: string | null;
  pageType?: SeoPageType;
  locale?: string;
  entityData?: SeoEntityData | null;
  fallbackTitle?: string | null;
  fallbackDescription?: string | null;
  /** Force private/noindex (e.g. auth pages). */
  isPrivatePage?: boolean;
  /** Explicit indexable override from route handler. */
  indexableOverride?: boolean | null;
  followOverride?: boolean | null;
  openGraphType?: "website" | "article" | "profile";
  jsonLd?: Record<string, unknown> | unknown[] | null;
};

export type ResolvedSeoMetadata = {
  title: string;
  description: string;
  alternates?: { canonical?: string };
  robots?: Metadata["robots"];
  openGraph?: {
    title?: string;
    description?: string;
    url?: string;
    type?: string;
    images?: Array<{ url: string; alt?: string; width?: number; height?: number }>;
  };
  twitter?: {
    card?: "summary" | "summary_large_image";
    title?: string;
    description?: string;
    images?: string[];
  };
  jsonLd?: Record<string, unknown> | unknown[] | null;
  keywords?: string[];
  warnings: string[];
  sources: {
    override: boolean;
    entity: boolean;
    template: boolean;
    settings: boolean;
  };
  /** Resolved asset ids (for debugging/admin preview). */
  ogImageAssetId?: string | null;
  twitterImageAssetId?: string | null;
};
