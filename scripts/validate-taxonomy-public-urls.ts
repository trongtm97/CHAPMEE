/**
 * Validates public taxonomy term URLs resolve to a landing path.
 * Run: npx tsx scripts/validate-taxonomy-public-urls.ts
 */
import { createPublicClient } from "../lib/data/public-client";
import { resolveTaxonomyCanonicalPath } from "../lib/seo/taxonomy-seo";
import { taxonomyLandingPath } from "../lib/taxonomy/public-url";
import { mapTaxonomyTermRow } from "../lib/taxonomy/map-row";
import type { TaxonomyType } from "../types/taxonomy";

const LANDING_PREFIX_TYPES: TaxonomyType[] = [
  "main_genre",
  "subgenre",
  "trope_tag",
  "editorial_tag",
  "setting_tag",
  "reader_experience",
  "presentation_mode",
  "character_tag",
  "relationship_tag",
  "narrative_style",
  "content_warning",
  "story_status",
  "monetization_access",
  "content_type",
  "age_rating"
];

async function main() {
  const db = createPublicClient();
  const { data, error } = await db
    .from("taxonomy_terms")
    .select("*")
    .eq("is_active", true)
    .eq("is_public", true)
    .in("type", LANDING_PREFIX_TYPES);

  if (error) {
    console.error("Failed to load taxonomy terms:", error.message);
    process.exit(1);
  }

  const rows = data ?? [];
  let missingPath = 0;
  let duplicateSlug = 0;
  const slugOwners = new Map<string, string[]>();

  for (const raw of rows) {
    const term = mapTaxonomyTermRow(raw as Record<string, unknown>);
    const canonical =
      resolveTaxonomyCanonicalPath(term) ?? taxonomyLandingPath(term.type, term.slug);

    if (!canonical || !canonical.startsWith("/")) {
      missingPath += 1;
      console.error(`MISSING PATH: ${term.type}/${term.slug} (${term.name})`);
      continue;
    }

    const owners = slugOwners.get(term.slug) ?? [];
    owners.push(term.type);
    slugOwners.set(term.slug, owners);
  }

  for (const [slug, types] of slugOwners) {
    if (types.length > 1) {
      duplicateSlug += 1;
      console.warn(`DUPLICATE SLUG: ${slug} -> ${types.join(", ")}`);
    }
  }

  console.log(
    `Checked ${rows.length} public taxonomy terms: ${missingPath} missing path, ${duplicateSlug} duplicate slugs across types.`
  );

  if (missingPath > 0) {
    process.exit(1);
  }
}

void main();
