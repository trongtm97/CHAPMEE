"use server";

import { createClient } from "@/lib/data/server";
import { isMissingSchemaError } from "@/lib/data/schema-errors";
import type { MessagingRestrictionItem } from "@/types/messaging-safety";

export async function getActiveMessagingRestrictionsList(): Promise<
  MessagingRestrictionItem[]
> {
  const db = await createClient();
  const now = new Date().toISOString();

  const { data, error } = await db
    .from("messaging_restrictions")
    .select(
      `id, user_id, restriction_type, reason_code, note, starts_at, ends_at, created_by,
       profiles!messaging_restrictions_user_id_fkey(display_name, username),
       creator:profiles!messaging_restrictions_created_by_fkey(display_name, username)`
    )
    .eq("is_active", true)
    .lte("starts_at", now)
    .or(`ends_at.is.null,ends_at.gt.${now}`)
    .order("starts_at", { ascending: false })
    .limit(100);

  if (error) {
    if (isMissingSchemaError(error)) {
      return [];
    }
    return [];
  }

  const items: MessagingRestrictionItem[] = [];

  for (const row of data ?? []) {
    const userRaw = row.profiles as unknown;
    const user = (Array.isArray(userRaw) ? userRaw[0] : userRaw) as {
      display_name: string | null;
      username: string | null;
    };
    const creatorRaw = row.creator as unknown;
    const creator = (Array.isArray(creatorRaw) ? creatorRaw[0] : creatorRaw) as {
      display_name: string | null;
      username: string | null;
    } | null;

    const userId = row.user_id as string;
    const { count } = await db
      .from("message_reports")
      .select("id", { count: "exact", head: true })
      .eq("reported_user_id", userId)
      .in("status", ["open", "reviewing", "resolved"]);

    items.push({
      id: row.id as string,
      userId,
      displayName: user.display_name ?? user.username ?? "Người dùng",
      username: user.username,
      restrictionType: row.restriction_type as MessagingRestrictionItem["restrictionType"],
      reasonCode: row.reason_code as string,
      note: row.note as string | null,
      startsAt: row.starts_at as string,
      endsAt: row.ends_at as string | null,
      createdByName: creator
        ? creator.display_name ?? creator.username
        : null,
      relatedReportCount: count ?? 0
    });
  }

  return items;
}
