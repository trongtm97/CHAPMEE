import type { SupabaseClient } from "@supabase/supabase-js";
import { validateReelsContent } from "@/lib/reels/validate-reels-item";
import { generateNumericPublicCode } from "@/lib/urls/public-code";
import { resolveContentSlug } from "@/lib/urls/slug";
import { getReelUrl } from "@/lib/urls/paths";
import type { ReelsFormValues, ReelsSourceType } from "@/types/reels";

export async function insertReelsItem(
  supabase: SupabaseClient,
  ownerId: string,
  values: Partial<ReelsFormValues>,
  extra?: {
    sourceType?: ReelsSourceType | null;
    sourceTextStart?: number | null;
    sourceTextEnd?: number | null;
    status?: string;
    scheduledAt?: string | null;
  }
) {
  const validation = validateReelsContent(values, "draft");

  if (!validation.ok || !validation.values) {
    return { error: validation.errors.join(" "), id: null };
  }

  const publicCode = await generateNumericPublicCode(supabase, "reel");
  const slug = resolveContentSlug(
    validation.values.title || validation.values.hook,
    "reel",
    publicCode
  );
  const canonicalPath = getReelUrl({ slug, public_code: publicCode });

  const { data, error } = await supabase
    .from("reels_items")
    .insert({
      background_image_url: validation.values.backgroundImageUrl,
      body: validation.values.body,
      chapter_id: validation.values.chapterId,
      cta: validation.values.cta,
      cta_type: validation.values.ctaType,
      hook: validation.values.hook,
      owner_id: ownerId,
      public_code: publicCode,
      slug,
      canonical_path: canonicalPath,
      scheduled_at: extra?.scheduledAt ?? null,
      source_text_end: extra?.sourceTextEnd ?? null,
      source_text_start: extra?.sourceTextStart ?? null,
      source_type: extra?.sourceType ?? "manual",
      status: extra?.status ?? "draft",
      story_id: validation.values.storyId || null,
      title: validation.values.title
    })
    .select("id")
    .single();

  if (error) {
    return { error: error.message, id: null };
  }

  return { error: null, id: data.id as string };
}

export async function updateReelsItemRow(
  supabase: SupabaseClient,
  reelId: string,
  ownerId: string,
  values: Partial<ReelsFormValues>,
  extra?: {
    sourceType?: ReelsSourceType | null;
    sourceTextStart?: number | null;
    sourceTextEnd?: number | null;
    status?: string;
    scheduledAt?: string | null;
    publishedAt?: string | null;
  }
) {
  const validation = validateReelsContent(values, "draft");

  if (!validation.ok || !validation.values) {
    return { error: validation.errors.join(" "), ok: false as const };
  }

  const { error } = await supabase
    .from("reels_items")
    .update({
      background_image_url: validation.values.backgroundImageUrl,
      body: validation.values.body,
      chapter_id: validation.values.chapterId,
      cta: validation.values.cta,
      cta_type: validation.values.ctaType,
      hook: validation.values.hook,
      published_at: extra?.publishedAt,
      scheduled_at: extra?.scheduledAt,
      source_text_end: extra?.sourceTextEnd ?? null,
      source_text_start: extra?.sourceTextStart ?? null,
      source_type: extra?.sourceType,
      status: extra?.status,
      story_id: validation.values.storyId || null,
      title: validation.values.title
    })
    .eq("id", reelId)
    .eq("owner_id", ownerId);

  if (error) {
    return { error: error.message, ok: false as const };
  }

  return { ok: true as const };
}

export async function duplicateReelsItem(
  supabase: SupabaseClient,
  ownerId: string,
  reelId: string
) {
  const { data: source, error: readError } = await supabase
    .from("reels_items")
    .select("*")
    .eq("id", reelId)
    .eq("owner_id", ownerId)
    .maybeSingle();

  if (readError || !source) {
    return { error: readError?.message ?? "Không tìm thấy Reels.", id: null };
  }

  const hook = source.hook?.startsWith("Bản sao")
    ? source.hook
    : `Bản sao — ${source.hook}`;

  const { data, error } = await supabase
    .from("reels_items")
    .insert({
      background_image_url: source.background_image_url,
      body: source.body,
      chapter_id: source.chapter_id,
      cta: source.cta,
      cta_type: source.cta_type,
      hook: hook.slice(0, 80),
      owner_id: ownerId,
      source_type: "manual",
      status: "draft",
      story_id: source.story_id,
      title: source.title ? `Bản sao — ${source.title}` : null
    })
    .select("id")
    .single();

  if (error) {
    return { error: error.message, id: null };
  }

  return { error: null, id: data.id as string };
}
