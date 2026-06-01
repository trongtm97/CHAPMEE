"use server";

import { revalidatePath } from "next/cache";
import {
  buildTaxonomySeoChecklistCsv,
  loadTaxonomySeoGovernanceSnapshot
} from "@/lib/admin/taxonomy-seo-governance";
import {
  getTaxonomySeoDescription,
  getTaxonomySeoTitle,
  rebuildTaxonomyCanonicalPath
} from "@/lib/seo/taxonomy-seo";
import { updateTaxonomyTermAdmin } from "@/lib/taxonomy/admin-data";
import { createClient } from "@/lib/supabase/server";
import { mapTaxonomyTermRow } from "@/lib/taxonomy/map-row";
import type { TaxonomyTermRow } from "@/types/taxonomy";

const REVALIDATE_PATHS = [
  "/admin/seo",
  "/admin/taxonomy",
  "/admin/content-hub/platform",
  "/sitemap.xml",
  "/pinterest-feed.xml",
  "/sitemap/static.xml",
  "/sitemap/stories.xml",
  "/sitemap/chapters.xml",
  "/sitemap/taxonomy.xml",
  "/sitemap/authors.xml",
  "/sitemap/posts.xml",
  "/sitemap/policies.xml",
  "/sitemap/reels.xml"
];

function revalidateSeoSurfaces() {
  for (const path of REVALIDATE_PATHS) {
    revalidatePath(path);
  }
}

async function requireTaxonomySeoAdmin() {
  const { checkStaffAnyPermission } = await import("@/lib/auth/staff-guards");
  const guard = await checkStaffAnyPermission([
    "taxonomy.edit",
    "taxonomy.create",
    "admin.dashboard.view"
  ]);
  if (!guard.ok) return guard;
  return { ok: true as const, actorId: guard.userId };
}

export async function loadTaxonomySeoGovernanceAction() {
  const guard = await requireTaxonomySeoAdmin();
  if (!guard.ok) {
    return { snapshot: null, error: guard.error };
  }
  const snapshot = await loadTaxonomySeoGovernanceSnapshot();
  return { snapshot, error: snapshot.error };
}

export async function generateMissingTaxonomySeoFallbacksAction() {
  const guard = await requireTaxonomySeoAdmin();
  if (!guard.ok) return { updated: 0, error: guard.error };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("taxonomy_terms")
    .select("*")
    .eq("use_for_seo", true)
    .limit(500);

  if (error) return { updated: 0, error: error.message };

  let updated = 0;
  for (const row of data ?? []) {
    const term = mapTaxonomyTermRow(row as Record<string, unknown>, {
      includeInternalNote: true
    }) as TaxonomyTermRow;

    const patch: Record<string, string | null> = {};
    if (!term.seo_title?.trim()) {
      patch.seo_title = getTaxonomySeoTitle(term);
    }
    if (!term.seo_description?.trim()) {
      patch.seo_description = getTaxonomySeoDescription(term);
    }
    if (!term.seo_h1?.trim()) {
      patch.seo_h1 = `Truyện ${term.name}`;
    }
    if (!term.seo_intro?.trim() && !term.description?.trim()) {
      patch.seo_intro = getTaxonomySeoDescription(term);
    }

    if (Object.keys(patch).length === 0) continue;

    const result = await updateTaxonomyTermAdmin(term.id, guard.actorId, patch);
    if (!result.error) updated += 1;
  }

  revalidateSeoSurfaces();
  return { updated, error: null };
}

export async function rebuildTaxonomyCanonicalPathsAction() {
  const guard = await requireTaxonomySeoAdmin();
  if (!guard.ok) return { updated: 0, error: guard.error };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("taxonomy_terms")
    .select("*")
    .eq("is_active", true)
    .limit(1000);

  if (error) return { updated: 0, error: error.message };

  let updated = 0;
  for (const row of data ?? []) {
    const term = mapTaxonomyTermRow(row as Record<string, unknown>, {
      includeInternalNote: true
    }) as TaxonomyTermRow;
    const path = rebuildTaxonomyCanonicalPath(term);
    if (!path) continue;

    const result = await updateTaxonomyTermAdmin(term.id, guard.actorId, {
      canonical_path: path
    });
    if (!result.error) updated += 1;
  }

  revalidateSeoSurfaces();
  return { updated, error: null };
}

export async function exportTaxonomySeoChecklistAction() {
  const guard = await requireTaxonomySeoAdmin();
  if (!guard.ok) return { csv: null, error: guard.error };

  const snapshot = await loadTaxonomySeoGovernanceSnapshot();
  return {
    csv: buildTaxonomySeoChecklistCsv(snapshot.rows),
    error: snapshot.error
  };
}

export async function toggleTaxonomySeoIndexableAction(termId: string, seoIndexable: boolean) {
  const guard = await requireTaxonomySeoAdmin();
  if (!guard.ok) return { ok: false, error: guard.error };

  const result = await updateTaxonomyTermAdmin(termId, guard.actorId, {
    seo_indexable: seoIndexable,
    use_for_seo: seoIndexable
  });

  if (result.error) return { ok: false, error: result.error };
  revalidateSeoSurfaces();
  return { ok: true, error: null };
}
