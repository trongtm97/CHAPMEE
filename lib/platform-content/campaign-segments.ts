import { createClient } from "@/lib/supabase/server";
import type { NotificationCampaignSegment } from "@/types/admin-notification-campaigns";

async function getCreatorUserIds(activeOnly = false) {
  const supabase = await createClient();
  let query = supabase.from("creator_profiles").select("user_id");
  if (activeOnly) {
    query = query.eq("status", "active");
  }
  const { data } = await query;
  return new Set((data ?? []).map((row) => String(row.user_id)));
}

async function getAllProfileIds() {
  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("id");
  return (data ?? []).map((row) => String(row.id));
}

async function resolveSegmentUserIds(segment: NotificationCampaignSegment): Promise<Set<string>> {
  const supabase = await createClient();
  const result = new Set<string>();

  if (segment === "all_users") {
    for (const id of await getAllProfileIds()) {
      result.add(id);
    }
    return result;
  }

  if (segment === "creators") {
    return getCreatorUserIds(true);
  }

  if (segment === "readers") {
    const creators = await getCreatorUserIds();
    for (const id of await getAllProfileIds()) {
      if (!creators.has(id)) {
        result.add(id);
      }
    }
    return result;
  }

  if (segment === "creators_with_story") {
    const { data: stories } = await supabase.from("stories").select("creator_id");
    const creatorIds = [...new Set((stories ?? []).map((row) => String(row.creator_id)))];
    if (creatorIds.length === 0) {
      return result;
    }
    const { data: creators } = await supabase
      .from("creator_profiles")
      .select("user_id")
      .in("id", creatorIds);
    for (const row of creators ?? []) {
      result.add(String(row.user_id));
    }
    return result;
  }

  if (segment === "creators_with_published_story") {
    const { data: stories } = await supabase
      .from("stories")
      .select("creator_id")
      .eq("status", "published");
    const creatorIds = [...new Set((stories ?? []).map((row) => String(row.creator_id)))];
    if (creatorIds.length === 0) {
      return result;
    }
    const { data: creators } = await supabase
      .from("creator_profiles")
      .select("user_id")
      .in("id", creatorIds);
    for (const row of creators ?? []) {
      result.add(String(row.user_id));
    }
    return result;
  }

  if (segment === "monetization_enabled") {
    const { data } = await supabase
      .from("creator_monetization_profiles")
      .select("user_id")
      .or("monetization_enabled.eq.true,status.eq.approved");
    for (const row of data ?? []) {
      result.add(String(row.user_id));
    }
    return result;
  }

  if (segment === "monetization_disabled") {
    const creators = await getCreatorUserIds(true);
    const { data } = await supabase
      .from("creator_monetization_profiles")
      .select("user_id")
      .or("monetization_enabled.eq.true,status.eq.approved");
    const enabled = new Set((data ?? []).map((row) => String(row.user_id)));
    for (const id of creators) {
      if (!enabled.has(id)) {
        result.add(id);
      }
    }
    return result;
  }

  if (segment === "verified_users") {
    const { data } = await supabase.from("profiles").select("id").eq("is_verified", true);
    for (const row of data ?? []) {
      result.add(String(row.id));
    }
    return result;
  }

  if (segment === "unverified_users") {
    const { data } = await supabase.from("profiles").select("id").eq("is_verified", false);
    for (const row of data ?? []) {
      result.add(String(row.id));
    }
    return result;
  }

  if (segment === "users_with_coin") {
    const { data } = await supabase
      .from("user_wallets")
      .select("user_id, paid_coin_balance, bonus_coin_balance");
    for (const row of data ?? []) {
      const paid = Number(row.paid_coin_balance ?? 0);
      const bonus = Number(row.bonus_coin_balance ?? 0);
      if (paid + bonus > 0) {
        result.add(String(row.user_id));
      }
    }
    return result;
  }

  if (segment === "inactive_7_days" || segment === "inactive_30_days") {
    const days = segment === "inactive_7_days" ? 7 : 30;
    const cutoff = new Date(Date.now() - days * 86400000).toISOString();
    const { data } = await supabase
      .from("user_lifecycle_states")
      .select("user_id, last_active_at")
      .or(`last_active_at.is.null,last_active_at.lt.${cutoff}`);
    for (const row of data ?? []) {
      result.add(String(row.user_id));
    }
    return result;
  }

  if (segment === "active_7_days") {
    const cutoff = new Date(Date.now() - 7 * 86400000).toISOString();
    const { data } = await supabase
      .from("user_lifecycle_states")
      .select("user_id, last_active_at")
      .gte("last_active_at", cutoff);
    for (const row of data ?? []) {
      result.add(String(row.user_id));
    }
    return result;
  }

  if (segment === "new_users_7_days") {
    const cutoff = new Date(Date.now() - 7 * 86400000).toISOString();
    const { data } = await supabase
      .from("profiles")
      .select("id")
      .gte("created_at", cutoff);
    for (const row of data ?? []) {
      result.add(String(row.id));
    }
    return result;
  }

  return result;
}

export async function resolveCampaignRecipientUserIds(input: {
  target_mode: "all" | "segment" | "manual";
  target_segments: string[];
  manual_user_ids: string[];
}): Promise<string[]> {
  if (input.target_mode === "manual") {
    return [...new Set(input.manual_user_ids.map(String))];
  }

  if (input.target_mode === "all") {
    return getAllProfileIds();
  }

  const merged = new Set<string>();
  for (const segment of input.target_segments) {
    const ids = await resolveSegmentUserIds(segment as NotificationCampaignSegment);
    for (const id of ids) {
      merged.add(id);
    }
  }

  return Array.from(merged);
}

export async function estimateCampaignRecipientCount(input: {
  target_mode: "all" | "segment" | "manual";
  target_segments: string[];
  manual_user_ids: string[];
}): Promise<number> {
  const ids = await resolveCampaignRecipientUserIds(input);
  return ids.length;
}
