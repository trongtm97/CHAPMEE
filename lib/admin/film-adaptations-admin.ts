import "server-only";

import { createClient } from "@/lib/data/server";
import { logAdminAction } from "@/lib/audit/log-admin-action";
import { requireAdminSettingsAccess } from "@/lib/auth/require-permission";
import {
  FILM_ADAPTATION_POLICY_SETTINGS_KEY,
  getFilmAdaptationPolicySettings,
  parseFilmAdaptationPolicySettings,
  type FilmAdaptationPolicySettings
} from "@/lib/settings/film-adaptation-settings";
import { canShowAdsOnFilmAdaptation } from "@/src/lib/film-adaptations/film-policy";
import { checkFilmYoutubeRow } from "@/src/lib/film-adaptations/youtube-checker";

export type FilmAdminListFilters = {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: string;
  rightsStatus?: string;
  adsPolicy?: string;
  relationType?: string;
  youtubeEmbedType?: string;
  contentOrigin?: "original" | "translation";
  unavailable?: "true" | "false";
};

export type FilmAdminListRow = {
  id: string;
  title: string;
  storyId: string;
  storyTitle: string;
  storySlug: string | null;
  storyPublicCode: string | null;
  storyContentOrigin: string | null;
  creatorName: string;
  youtubeEmbedType: string;
  relationType: string;
  status: string;
  rightsStatus: string;
  adsPolicy: string;
  lastCheckedAt: string | null;
  lastCheckStatus: string | null;
  createdAt: string;
};

export type FilmAdminListResult = {
  rows: FilmAdminListRow[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
};

type FilmRow = {
  id: string;
  story_id: string;
  title: string;
  youtube_embed_type: string;
  relation_type: string;
  status: string;
  rights_status: string;
  ads_policy: string;
  last_checked_at: string | null;
  last_check_status: string | null;
  created_at: string;
  youtube_url: string;
  youtube_video_id: string | null;
  youtube_playlist_id: string | null;
  stories:
    | {
        id: string;
        title: string;
        slug: string | null;
        public_code: string | null;
        content_origin: string | null;
      }
    | {
        id: string;
        title: string;
        slug: string | null;
        public_code: string | null;
        content_origin: string | null;
      }[]
    | null;
  profiles: {
    display_name: string | null;
    username: string | null;
  } | null;
};

const FILM_SELECT = `
  id,
  story_id,
  title,
  youtube_embed_type,
  relation_type,
  status,
  rights_status,
  ads_policy,
  last_checked_at,
  last_check_status,
  created_at,
  youtube_url,
  youtube_video_id,
  youtube_playlist_id,
  stories!inner(id, title, slug, public_code, content_origin),
  profiles!story_film_adaptations_creator_profile_id_fkey(id, display_name, username)
`;

async function assertUpdateAccess() {
  const guard = await requireAdminSettingsAccess("/admin/film-adaptations");
  if (!guard.ok) {
    throw new Error(guard.error);
  }
  if (!guard.context?.userId) {
    throw new Error("Bạn cần đăng nhập.");
  }
  return guard.context.userId;
}

function escapeIlike(term: string) {
  return term.replace(/[%_,]/g, " ");
}

function mapRow(row: FilmRow): FilmAdminListRow {
  const story = Array.isArray(row.stories) ? row.stories[0] : row.stories;
  const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
  const creatorName =
    profile?.display_name?.trim() ||
    profile?.username?.trim() ||
    "—";
  return {
    id: row.id,
    title: row.title,
    storyId: row.story_id,
    storyTitle: story?.title ?? "—",
    storySlug: story?.slug ?? null,
    storyPublicCode: story?.public_code ?? null,
    storyContentOrigin: story?.content_origin ?? null,
    creatorName,
    youtubeEmbedType: row.youtube_embed_type,
    relationType: row.relation_type,
    status: row.status,
    rightsStatus: row.rights_status,
    adsPolicy: row.ads_policy,
    lastCheckedAt: row.last_checked_at,
    lastCheckStatus: row.last_check_status,
    createdAt: row.created_at
  };
}

export async function getAdminFilmAdaptationList(
  filters: FilmAdminListFilters = {}
): Promise<FilmAdminListResult> {
  const guard = await requireAdminSettingsAccess("/admin/film-adaptations");
  if (!guard.ok) {
    throw new Error(guard.error);
  }

  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, filters.pageSize ?? 20));
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const db = await createClient();
  let query = db
    .from("story_film_adaptations")
    .select(FILM_SELECT, { count: "exact" })
    .order("created_at", { ascending: false });

  if (filters.status) {
    query = query.eq("status", filters.status);
  }
  if (filters.rightsStatus) {
    query = query.eq("rights_status", filters.rightsStatus);
  }
  if (filters.adsPolicy) {
    query = query.eq("ads_policy", filters.adsPolicy);
  }
  if (filters.relationType) {
    query = query.eq("relation_type", filters.relationType);
  }
  if (filters.youtubeEmbedType) {
    query = query.eq("youtube_embed_type", filters.youtubeEmbedType);
  }
  if (filters.contentOrigin) {
    query = query.eq("stories.content_origin", filters.contentOrigin);
  }
  if (filters.unavailable === "true") {
    query = query.or("status.eq.unavailable,last_check_status.eq.failed");
  } else if (filters.unavailable === "false") {
    query = query.neq("status", "unavailable").neq("last_check_status", "failed");
  }
  if (filters.search?.trim()) {
    const term = escapeIlike(filters.search.trim());
    query = query.or(
      `title.ilike.%${term}%,stories.title.ilike.%${term}%,profiles.display_name.ilike.%${term}%,profiles.username.ilike.%${term}%`
    );
  }

  const { data, error, count } = await query.range(from, to);
  if (error) {
    throw new Error(error.message);
  }

  const rows = ((data ?? []) as FilmRow[]).map(mapRow);
  const totalCount = count ?? 0;
  return {
    rows,
    page,
    pageSize,
    totalCount,
    totalPages: Math.max(1, Math.ceil(totalCount / pageSize))
  };
}

type FilmAdminItemAction =
  | "publish"
  | "hide"
  | "reject"
  | "mark_unavailable"
  | "mark_copyright_disputed"
  | "mark_rights_verified"
  | "disable_ads"
  | "enable_ads"
  | "mark_ok";

const ACTION_AUDIT: Record<FilmAdminItemAction, string> = {
  publish: "film_publish",
  hide: "film_hide",
  reject: "film_reject",
  mark_unavailable: "film_mark_unavailable",
  mark_copyright_disputed: "film_mark_copyright_disputed",
  mark_rights_verified: "film_mark_rights_verified",
  disable_ads: "film_disable_ads",
  enable_ads: "film_enable_ads",
  mark_ok: "film_recheck_ok"
};

async function fetchFilmRow(db: Awaited<ReturnType<typeof createClient>>, filmId: string) {
  const { data, error } = await db
    .from("story_film_adaptations")
    .select(FILM_SELECT)
    .eq("id", filmId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Không tìm thấy phim chuyển thể.");
  return data as FilmRow;
}

export async function updateFilmAdaptationAdminAction(input: {
  filmId: string;
  action: FilmAdminItemAction;
}) {
  const actorId = await assertUpdateAccess();
  const db = await createClient();
  const existing = await fetchFilmRow(db, input.filmId);
  const story = Array.isArray(existing.stories) ? existing.stories[0] : existing.stories;
  const now = new Date().toISOString();
  const patch: Record<string, unknown> = { updated_at: now };

  switch (input.action) {
    case "publish":
      patch.status = "published";
      patch.published_at = now;
      break;
    case "hide":
      patch.status = "hidden";
      break;
    case "reject":
      patch.status = "rejected";
      break;
    case "mark_unavailable":
      patch.status = "unavailable";
      patch.last_check_status = "failed";
      patch.last_checked_at = now;
      break;
    case "mark_copyright_disputed":
      patch.status = "copyright_disputed";
      patch.rights_status = "disputed";
      break;
    case "mark_rights_verified":
      patch.rights_status = "verified";
      break;
    case "disable_ads":
      patch.ads_policy = "ads_disabled";
      break;
    case "enable_ads": {
      const settings = await getFilmAdaptationPolicySettings();
      const allowed = canShowAdsOnFilmAdaptation(
        {
          id: story?.id,
          content_origin: story?.content_origin
        },
        {
          ads_policy: existing.ads_policy,
          rights_status: existing.rights_status
        },
        settings
      );
      if (!allowed) {
        throw new Error("Policy không cho phép bật quảng cáo cho phim này.");
      }
      patch.ads_policy = "ads_allowed";
      break;
    }
    case "mark_ok":
      patch.last_check_status = "ok";
      patch.last_check_error = null;
      patch.last_checked_at = now;
      if (existing.status === "unavailable") {
        patch.status = "hidden";
      }
      break;
    default:
      throw new Error("Hành động không hợp lệ.");
  }

  const { error: updateError } = await db
    .from("story_film_adaptations")
    .update(patch)
    .eq("id", input.filmId);
  if (updateError) throw new Error(updateError.message);

  await logAdminAction({
    actorId,
    action: ACTION_AUDIT[input.action],
    targetType: "story_film_adaptation",
    targetId: input.filmId,
    metadata: {
      action: input.action,
      before_json: existing,
      after_json: patch
    }
  });
}

export async function recheckFilmAdaptation(filmId: string) {
  const actorId = await assertUpdateAccess();
  const db = await createClient();
  const existing = await fetchFilmRow(db, filmId);
  const settings = await getFilmAdaptationPolicySettings();

  const check = await checkFilmYoutubeRow({
    id: existing.id,
    story_id: existing.story_id,
    title: existing.title,
    status: existing.status,
    youtube_url: existing.youtube_url,
    youtube_video_id: existing.youtube_video_id,
    youtube_playlist_id: existing.youtube_playlist_id,
    youtube_embed_type: existing.youtube_embed_type
  });

  if (check.outcome === "skipped") {
    return;
  }

  const outcome = check.outcome;
  const checkError = check.error;
  const ok = outcome === "ok";
  const now = new Date().toISOString();
  const patch: Record<string, unknown> = {
    last_checked_at: now,
    last_check_status: ok ? "ok" : outcome === "failed" ? "failed" : "unknown",
    last_check_error: checkError,
    updated_at: now
  };
  if (!ok && outcome === "failed" && settings.hide_unavailable_films_automatically) {
    patch.status = "unavailable";
  }

  const { error: updateError } = await db
    .from("story_film_adaptations")
    .update(patch)
    .eq("id", filmId);
  if (updateError) throw new Error(updateError.message);

  await logAdminAction({
    actorId,
    action: ok ? "film_recheck_ok" : "film_mark_unavailable",
    targetType: "story_film_adaptation",
    targetId: filmId,
    metadata: { before_json: existing, after_json: patch, outcome, checkError }
  });
}

export async function updateFilmAdaptationPolicySettings(
  input: Partial<FilmAdaptationPolicySettings>
) {
  const actorId = await assertUpdateAccess();
  const db = await createClient();
  const current = await getFilmAdaptationPolicySettings();
  const merged = parseFilmAdaptationPolicySettings({
    ...current,
    ...input,
    paid_film_enabled: false,
    coin_unlock_film_enabled: false,
    allow_chapter_level_linking: false
  });

  const { error } = await db.from("app_settings").upsert(
    {
      key: FILM_ADAPTATION_POLICY_SETTINGS_KEY,
      value: merged,
      is_public: false,
      updated_by: actorId,
      updated_at: new Date().toISOString()
    },
    { onConflict: "key" }
  );
  if (error) throw new Error(error.message);

  await logAdminAction({
    actorId,
    action: "film_policy_update",
    targetType: "film_adaptation_policy_settings",
    targetId: FILM_ADAPTATION_POLICY_SETTINGS_KEY,
    metadata: { before_json: current, after_json: merged }
  });
  return merged;
}
