/**
 * Ensures every seeded subgenre has a parent map entry (slug keys match migration 164).
 * Run: node scripts/verify-taxonomy-subgenre-slugs.mjs
 */
import { DEFAULT_TAXONOMY_SEED_TERMS } from "../lib/taxonomy/seed/default-terms.ts";
import { SUBGENRE_PARENT_SLUG_BY_SUBGENRE_SLUG } from "../lib/taxonomy/seed/subgenre-parents.ts";
import { slugify } from "../lib/slugify.ts";

const subgenres = DEFAULT_TAXONOMY_SEED_TERMS.filter((t) => t.type === "subgenre");
const missing = [];
const extra = new Set(Object.keys(SUBGENRE_PARENT_SLUG_BY_SUBGENRE_SLUG));

for (const term of subgenres) {
  const slug = term.slug ?? slugify(term.name);
  extra.delete(slug);
  if (!SUBGENRE_PARENT_SLUG_BY_SUBGENRE_SLUG[slug]) {
    missing.push({ name: term.name, slug });
  }
}

if (missing.length > 0) {
  console.error("Subgenres missing parent map:");
  for (const row of missing) {
    console.error(`  - ${row.name} (${row.slug})`);
  }
  process.exit(1);
}

if (extra.size > 0) {
  console.warn("Parent map has slugs not in seed:", [...extra].join(", "));
}

console.log(`OK: ${subgenres.length} subgenres mapped to main_genre parents.`);
