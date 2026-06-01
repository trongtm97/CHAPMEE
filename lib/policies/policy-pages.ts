import { createClient } from "@/lib/supabase/server";
import { generateNumericPublicCode } from "@/lib/urls/public-code";
import { getPolicyUrl } from "@/lib/urls/paths";
import type {
  CreatePolicyPageInput,
  ListPolicyPagesOptions,
  PolicyPage,
  PolicyPageStats,
  PolicyVersion,
  UpdatePolicyPageInput
} from "@/types/policy-pages";

function mapPolicyPage(row: Record<string, unknown>): PolicyPage {
  return {
    id: String(row.id),
    public_code: row.public_code ? String(row.public_code) : null,
    slug: String(row.slug),
    title: String(row.title),
    summary: row.summary ? String(row.summary) : null,
    content: String(row.content ?? ""),
    policy_type: row.policy_type as PolicyPage["policy_type"],
    status: row.status as PolicyPage["status"],
    visibility: row.visibility as PolicyPage["visibility"],
    version: Number(row.version ?? 1),
    is_required: Boolean(row.is_required),
    effective_date: row.effective_date ? String(row.effective_date) : null,
    seo_title: row.seo_title ? String(row.seo_title) : null,
    seo_description: row.seo_description ? String(row.seo_description) : null,
    seo_indexable: Boolean(row.seo_indexable ?? true),
    canonical_path: row.canonical_path ? String(row.canonical_path) : null,
    created_by: row.created_by ? String(row.created_by) : null,
    updated_by: row.updated_by ? String(row.updated_by) : null,
    published_by: row.published_by ? String(row.published_by) : null,
    published_at: row.published_at ? String(row.published_at) : null,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at)
  };
}

function mapPolicyVersion(row: Record<string, unknown>): PolicyVersion {
  return {
    id: String(row.id),
    policy_id: String(row.policy_id),
    version: Number(row.version),
    title: String(row.title),
    summary: row.summary ? String(row.summary) : null,
    content: String(row.content),
    change_note: row.change_note ? String(row.change_note) : null,
    created_by: row.created_by ? String(row.created_by) : null,
    created_at: String(row.created_at)
  };
}

export function isPolicyPubliclyVisible(item: PolicyPage) {
  return item.status === "published" && item.visibility === "public";
}

export async function listPolicyPages(
  options: ListPolicyPagesOptions = {}
): Promise<{ items: PolicyPage[]; total: number; error: string | null }> {
  const supabase = await createClient();
  const page = options.page ?? 1;
  const pageSize = options.pageSize ?? 25;
  const offset = (page - 1) * pageSize;

  let query = supabase.from("policy_pages").select("*", { count: "exact" });

  if (options.publicOnly) {
    query = query.eq("status", "published").eq("visibility", "public");
  } else if (options.status && options.status !== "all") {
    const statuses = Array.isArray(options.status) ? options.status : [options.status];
    query = query.in("status", statuses);
  }

  if (options.policyType && options.policyType !== "all") {
    query = query.eq("policy_type", options.policyType);
  }

  const search = options.search?.trim();
  if (search) {
    query = query.or(
      `title.ilike.%${search}%,slug.ilike.%${search}%,summary.ilike.%${search}%`
    );
  }

  query = query.order("updated_at", { ascending: false });

  const { data, error, count } = await query.range(offset, offset + pageSize - 1);
  if (error) {
    return { items: [], total: 0, error: error.message };
  }

  return {
    items: (data ?? []).map((row) => mapPolicyPage(row as Record<string, unknown>)),
    total: count ?? 0,
    error: null
  };
}

export async function getPolicyPageById(id: string): Promise<{
  item: PolicyPage | null;
  error: string | null;
}> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("policy_pages").select("*").eq("id", id).maybeSingle();
  if (error) return { item: null, error: error.message };
  return { item: data ? mapPolicyPage(data as Record<string, unknown>) : null, error: null };
}

export async function getPolicyPageBySlug(
  slug: string,
  options?: { publicOnly?: boolean }
): Promise<{ item: PolicyPage | null; error: string | null }> {
  const supabase = await createClient();
  let query = supabase.from("policy_pages").select("*").eq("slug", slug);
  if (options?.publicOnly) {
    query = query.eq("status", "published").eq("visibility", "public");
  }
  const { data, error } = await query.maybeSingle();
  if (error) return { item: null, error: error.message };
  return { item: data ? mapPolicyPage(data as Record<string, unknown>) : null, error: null };
}

export async function getPolicyPageByPublicCode(
  publicCode: string,
  options?: { publicOnly?: boolean }
): Promise<{ item: PolicyPage | null; error: string | null }> {
  const supabase = await createClient();
  let query = supabase.from("policy_pages").select("*").eq("public_code", publicCode);
  if (options?.publicOnly) {
    query = query.eq("status", "published").eq("visibility", "public");
  }
  const { data, error } = await query.maybeSingle();
  if (error) return { item: null, error: error.message };
  return { item: data ? mapPolicyPage(data as Record<string, unknown>) : null, error: null };
}

export async function getPolicyPageStats(): Promise<{
  stats: PolicyPageStats;
  error: string | null;
}> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("policy_pages").select("status");
  if (error) {
    return {
      stats: { total: 0, published: 0, draft: 0, archived: 0 },
      error: error.message
    };
  }
  const rows = data ?? [];
  return {
    stats: {
      total: rows.length,
      published: rows.filter((r) => r.status === "published").length,
      draft: rows.filter((r) => r.status === "draft").length,
      archived: rows.filter((r) => r.status === "archived").length
    },
    error: null
  };
}

export async function listPolicyVersions(policyId: string): Promise<{
  items: PolicyVersion[];
  error: string | null;
}> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("policy_versions")
    .select("*")
    .eq("policy_id", policyId)
    .order("version", { ascending: false });

  if (error) return { items: [], error: error.message };
  return {
    items: (data ?? []).map((row) => mapPolicyVersion(row as Record<string, unknown>)),
    error: null
  };
}

async function ensurePublicCode(
  supabase: Awaited<ReturnType<typeof createClient>>,
  slug: string,
  existing?: string | null
) {
  if (existing) return existing;
  const code = await generateNumericPublicCode(supabase, "policy");
  return code;
}

export async function createPolicyPage(input: CreatePolicyPageInput): Promise<{
  item: PolicyPage | null;
  error: string | null;
}> {
  const supabase = await createClient();
  const publicCode = await ensurePublicCode(supabase, input.slug);
  const canonicalPath = getPolicyUrl({ slug: input.slug, public_code: publicCode });

  const { data, error } = await supabase
    .from("policy_pages")
    .insert({
      title: input.title,
      slug: input.slug,
      summary: input.summary ?? null,
      content: input.content ?? "",
      policy_type: input.policy_type,
      status: input.status ?? "draft",
      visibility: input.visibility ?? "public",
      is_required: input.is_required ?? false,
      effective_date: input.effective_date ?? null,
      seo_title: input.seo_title ?? null,
      seo_description: input.seo_description ?? null,
      seo_indexable: input.seo_indexable ?? true,
      public_code: publicCode,
      canonical_path: canonicalPath,
      created_by: input.created_by ?? null,
      updated_by: input.updated_by ?? null
    })
    .select("*")
    .single();

  if (error) return { item: null, error: error.message };
  return { item: mapPolicyPage(data as Record<string, unknown>), error: null };
}

export async function updatePolicyPage(
  id: string,
  input: UpdatePolicyPageInput
): Promise<{ item: PolicyPage | null; error: string | null }> {
  const supabase = await createClient();
  const { item: current } = await getPolicyPageById(id);
  if (!current) return { item: null, error: "Không tìm thấy chính sách." };

  const slug = input.slug ?? current.slug;
  const publicCode = current.public_code ?? (await ensurePublicCode(supabase, slug));
  const patch: Record<string, unknown> = {
    ...input,
    updated_at: new Date().toISOString()
  };
  delete patch.change_note;

  if (input.slug && input.slug !== current.slug) {
    patch.canonical_path = getPolicyUrl({ slug, public_code: publicCode });
  }
  if (!current.public_code) {
    patch.public_code = publicCode;
    patch.canonical_path = getPolicyUrl({ slug, public_code: publicCode });
  }

  const { data, error } = await supabase
    .from("policy_pages")
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();

  if (error) return { item: null, error: error.message };
  return { item: mapPolicyPage(data as Record<string, unknown>), error: null };
}

export async function publishPolicyPage(
  id: string,
  actorId: string,
  changeNote?: string | null
): Promise<{ item: PolicyPage | null; error: string | null }> {
  const supabase = await createClient();
  const { item: current } = await getPolicyPageById(id);
  if (!current) return { item: null, error: "Không tìm thấy chính sách." };

  const nextVersion = current.version + (current.status === "published" ? 1 : 0);
  const now = new Date().toISOString();
  const publicCode =
    current.public_code ?? (await ensurePublicCode(supabase, current.slug));
  const canonicalPath = getPolicyUrl({ slug: current.slug, public_code: publicCode });

  const { error: versionError } = await supabase.from("policy_versions").insert({
    policy_id: id,
    version: current.status === "published" ? nextVersion : current.version,
    title: current.title,
    summary: current.summary,
    content: current.content,
    change_note: changeNote ?? null,
    created_by: actorId
  });

  if (versionError) return { item: null, error: versionError.message };

  const { data, error } = await supabase
    .from("policy_pages")
    .update({
      status: "published",
      version: current.status === "published" ? nextVersion : current.version,
      published_at: now,
      published_by: actorId,
      updated_by: actorId,
      updated_at: now,
      public_code: publicCode,
      canonical_path: canonicalPath
    })
    .eq("id", id)
    .select("*")
    .single();

  if (error) return { item: null, error: error.message };
  return { item: mapPolicyPage(data as Record<string, unknown>), error: null };
}

export async function archivePolicyPage(
  id: string,
  actorId: string
): Promise<{ item: PolicyPage | null; error: string | null }> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("policy_pages")
    .update({
      status: "archived",
      updated_by: actorId,
      updated_at: new Date().toISOString()
    })
    .eq("id", id)
    .select("*")
    .single();

  if (error) return { item: null, error: error.message };
  return { item: mapPolicyPage(data as Record<string, unknown>), error: null };
}
