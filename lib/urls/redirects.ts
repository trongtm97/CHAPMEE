import { createClient } from "@/lib/supabase/server";
import type { PublicEntityType } from "@/lib/urls/constants";

export type UrlRedirectRow = {
  id: string;
  source_path: string;
  target_path: string;
  entity_type: string | null;
  entity_id: string | null;
  status_code: number;
  is_active: boolean;
  reason: string | null;
};

export type CreateUrlRedirectInput = {
  sourcePath: string;
  targetPath: string;
  entityType?: PublicEntityType | null;
  entityId?: string | null;
  statusCode?: number;
  reason?: string | null;
  createdBy?: string | null;
};

function normalizePath(path: string): string {
  if (!path.startsWith("/")) {
    return `/${path}`;
  }
  return path.replace(/\/+$/, "") || "/";
}

export async function lookupActiveUrlRedirect(
  sourcePath: string
): Promise<UrlRedirectRow | null> {
  const supabase = await createClient();
  const normalized = normalizePath(sourcePath);
  const { data, error } = await supabase
    .from("url_redirects")
    .select(
      "id, source_path, target_path, entity_type, entity_id, status_code, is_active, reason"
    )
    .eq("source_path", normalized)
    .eq("is_active", true)
    .maybeSingle();

  if (error) {
    console.error("[url_redirects] lookup failed:", error.message);
    return null;
  }

  return (data as UrlRedirectRow | null) ?? null;
}

export async function hasActiveRedirectFromTargetToSource(
  sourcePath: string,
  targetPath: string
): Promise<boolean> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("url_redirects")
    .select("id")
    .eq("source_path", normalizePath(targetPath))
    .eq("target_path", normalizePath(sourcePath))
    .eq("is_active", true)
    .maybeSingle();

  return Boolean(data);
}

export async function hasConflictingActiveRedirect(
  sourcePath: string
): Promise<boolean> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("url_redirects")
    .select("id")
    .eq("source_path", normalizePath(sourcePath))
    .eq("is_active", true)
    .maybeSingle();

  return Boolean(data);
}

export type CreateRedirectResult =
  | { ok: true; id: string }
  | { ok: false; error: string };

/**
 * Create a redirect with loop/conflict guards.
 */
export async function createUrlRedirect(
  input: CreateUrlRedirectInput
): Promise<CreateRedirectResult> {
  const sourcePath = normalizePath(input.sourcePath);
  const targetPath = normalizePath(input.targetPath);
  const statusCode = input.statusCode ?? 301;

  if (sourcePath === targetPath) {
    return { ok: false, error: "source_path và target_path không được giống nhau." };
  }

  if (![301, 302, 307, 308].includes(statusCode)) {
    return { ok: false, error: "status_code không hợp lệ." };
  }

  if (await hasActiveRedirectFromTargetToSource(sourcePath, targetPath)) {
    return {
      ok: false,
      error: "Redirect ngược đã tồn tại — có thể gây vòng lặp."
    };
  }

  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("url_redirects")
    .select("id, target_path")
    .eq("source_path", sourcePath)
    .eq("is_active", true)
    .maybeSingle();

  if (existing && existing.target_path !== targetPath) {
    return {
      ok: false,
      error: "source_path đã có redirect active khác."
    };
  }

  if (existing) {
    return { ok: true, id: String(existing.id) };
  }

  const { data, error } = await supabase
    .from("url_redirects")
    .insert({
      source_path: sourcePath,
      target_path: targetPath,
      entity_type: input.entityType ?? null,
      entity_id: input.entityId ?? null,
      status_code: statusCode,
      is_active: true,
      reason: input.reason ?? null,
      created_by: input.createdBy ?? null
    })
    .select("id")
    .single();

  if (error) {
    return { ok: false, error: error.message };
  }

  return { ok: true, id: String(data.id) };
}

export async function deactivateUrlRedirect(id: string): Promise<boolean> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("url_redirects")
    .update({ is_active: false })
    .eq("id", id);

  return !error;
}

export type SlugHistoryInput = {
  entityType: PublicEntityType;
  entityId: string;
  oldSlug: string | null;
  newSlug: string | null;
  oldPath: string | null;
  newPath: string | null;
  changedBy?: string | null;
};

export async function recordSlugHistory(input: SlugHistoryInput): Promise<void> {
  const supabase = await createClient();
  await supabase.from("entity_slug_history").insert({
    entity_type: input.entityType,
    entity_id: input.entityId,
    old_slug: input.oldSlug,
    new_slug: input.newSlug,
    old_path: input.oldPath,
    new_path: input.newPath,
    changed_by: input.changedBy ?? null
  });
}

export async function registerSlugChangeRedirects(input: {
  entityType: PublicEntityType;
  entityId: string;
  oldPath: string;
  newCanonicalPath: string;
  changedBy?: string | null;
}): Promise<CreateRedirectResult> {
  return createUrlRedirect({
    sourcePath: input.oldPath,
    targetPath: input.newCanonicalPath,
    entityType: input.entityType,
    entityId: input.entityId,
    statusCode: 301,
    reason: "slug_change",
    createdBy: input.changedBy ?? null
  });
}
