"use server";

import { createClient } from "@/lib/supabase/server";
import {
  createUrlRedirect,
  deactivateUrlRedirect,
  type UrlRedirectRow
} from "@/lib/urls/redirects";
import { NUMERIC_PUBLIC_CODE_REGEX } from "@/lib/urls/constants";
import { getStoryUrl } from "@/lib/urls/paths";

export type UrlAdminRedirect = UrlRedirectRow;
export type UrlAdminSlugHistory = {
  id: string;
  entity_type: string;
  entity_id: string;
  old_slug: string | null;
  new_slug: string | null;
  old_path: string | null;
  new_path: string | null;
  changed_at: string;
};

export type UrlAdminWarning = {
  id: string;
  severity: "warning" | "critical";
  message: string;
};

export type UrlAdminDashboard = {
  redirects: UrlAdminRedirect[];
  slugHistory: UrlAdminSlugHistory[];
  warnings: UrlAdminWarning[];
  error: string | null;
};

const UUID_IN_PATH = /\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

export async function loadUrlAdminDashboard(): Promise<UrlAdminDashboard> {
  const supabase = await createClient();

  const [redirectsRes, historyRes] = await Promise.all([
    supabase
      .from("url_redirects")
      .select(
        "id, source_path, target_path, entity_type, entity_id, status_code, is_active, reason, created_at"
      )
      .order("created_at", { ascending: false })
      .limit(100),
    supabase
      .from("entity_slug_history")
      .select("id, entity_type, entity_id, old_slug, new_slug, old_path, new_path, changed_at")
      .order("changed_at", { ascending: false })
      .limit(100)
  ]);

  if (redirectsRes.error || historyRes.error) {
    return {
      redirects: [],
      slugHistory: [],
      warnings: [],
      error: redirectsRes.error?.message ?? historyRes.error?.message ?? "Load failed"
    };
  }

  const redirects = (redirectsRes.data ?? []) as UrlAdminRedirect[];
  const slugHistory = (historyRes.data ?? []) as UrlAdminSlugHistory[];
  const warnings: UrlAdminWarning[] = [];

  const activeSources = new Map<string, string>();
  for (const row of redirects) {
    if (!row.is_active) continue;
    if (activeSources.has(row.source_path)) {
      warnings.push({
        id: `dup-source-${row.id}`,
        severity: "critical",
        message: `Trùng source_path active: ${row.source_path}`
      });
    }
    activeSources.set(row.source_path, row.target_path);

    if (row.source_path === row.target_path) {
      warnings.push({
        id: `same-path-${row.id}`,
        severity: "critical",
        message: `Redirect vòng (source = target): ${row.source_path}`
      });
    }

    const reverse = redirects.find(
      (other) =>
        other.is_active &&
        other.id !== row.id &&
        other.source_path === row.target_path &&
        other.target_path === row.source_path
    );
    if (reverse) {
      warnings.push({
        id: `loop-${row.id}-${reverse.id}`,
        severity: "critical",
        message: `Redirect loop: ${row.source_path} ↔ ${row.target_path}`
      });
    }

    if (UUID_IN_PATH.test(row.source_path) || UUID_IN_PATH.test(row.target_path)) {
      warnings.push({
        id: `uuid-url-${row.id}`,
        severity: "warning",
        message: `URL chứa UUID: ${row.source_path} → ${row.target_path}`
      });
    }
  }

  const tables = [
    { table: "stories", label: "story" },
    { table: "episodes", label: "chapter" },
    { table: "reels_items", label: "reel" },
    { table: "admin_content_posts", label: "content_post" },
    { table: "platform_announcements", label: "announcement" }
  ] as const;

  for (const { table, label } of tables) {
    const { data } = await supabase.from(table).select("id, public_code, slug").limit(500);
    for (const row of data ?? []) {
      const code = String((row as { public_code?: string }).public_code ?? "");
      if (code && !NUMERIC_PUBLIC_CODE_REGEX.test(code)) {
        warnings.push({
          id: `bad-code-${table}-${row.id}`,
          severity: "critical",
          message: `${label} public_code không numeric-only: ${code}`
        });
      }
    }
  }

  return { redirects, slugHistory, warnings, error: null };
}

export async function createUrlRedirectAction(input: {
  sourcePath: string;
  targetPath: string;
  reason?: string;
}) {
  return createUrlRedirect({
    sourcePath: input.sourcePath,
    targetPath: input.targetPath,
    reason: input.reason ?? "manual_admin",
    statusCode: 301
  });
}

export async function deactivateUrlRedirectAction(id: string) {
  const ok = await deactivateUrlRedirect(id);
  return { ok, message: ok ? null : "Không thể tắt redirect." };
}

export async function rebuildStoryCanonicalPathAction(storyId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("stories")
    .select("id, slug, public_code")
    .eq("id", storyId)
    .maybeSingle();

  if (error || !data?.public_code) {
    return { ok: false, message: error?.message ?? "Story not found" };
  }

  const canonical = getStoryUrl({
    slug: data.slug,
    public_code: data.public_code
  });

  const { error: updateError } = await supabase
    .from("stories")
    .update({ canonical_url: canonical })
    .eq("id", storyId);

  return {
    ok: !updateError,
    message: updateError?.message ?? null,
    canonical
  };
}
