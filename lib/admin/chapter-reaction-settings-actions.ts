"use server";

import { revalidatePath } from "next/cache";
import { sql } from "drizzle-orm";
import { logAdminAction } from "@/lib/audit/log-admin-action";
import { requireAdminSettingsAccess } from "@/lib/auth/require-permission";
import { db } from "@/lib/db";
import { listChapterReactionTypes } from "@/lib/reactions/chapter-reactions";

export type AdminReactionTypeRow = {
  key: string;
  label: string;
  emoji: string;
  isEnabled: boolean;
  sortOrder: number;
  updatedAt: string | null;
};

export async function getAdminChapterReactionTypes(): Promise<AdminReactionTypeRow[]> {
  const types = await listChapterReactionTypes({ includeDisabled: true });
  try {
    const result = await db.execute(sql`
      select key, label, emoji, is_enabled, sort_order, updated_at
      from public.chapter_reaction_types
      order by sort_order asc, key asc
    `);

    return (
      result.rows as Array<{
        key: string;
        label: string;
        emoji: string;
        is_enabled: boolean;
        sort_order: number;
        updated_at: string | null;
      }>
    ).map((row) => ({
      key: row.key,
      label: row.label,
      emoji: row.emoji,
      isEnabled: row.is_enabled,
      sortOrder: row.sort_order,
      updatedAt: row.updated_at
    }));
  } catch {
    return types.map((type) => ({
      key: type.key,
      label: type.label,
      emoji: type.emoji,
      isEnabled: type.isEnabled,
      sortOrder: type.sortOrder,
      updatedAt: null
    }));
  }
}

export async function updateChapterReactionTypeAction(formData: FormData) {
  const guard = await requireAdminSettingsAccess("/admin/engagement/reactions");
  if (!guard.ok) {
    return { ok: false as const, message: guard.error };
  }

  const key = String(formData.get("key") ?? "").trim();
  const label = String(formData.get("label") ?? "").trim();
  const emoji = String(formData.get("emoji") ?? "").trim();
  const sortOrder = Number(formData.get("sortOrder") ?? 0);
  const isEnabled = formData.get("isEnabled") === "on";

  if (!key || !label || !emoji) {
    return { ok: false as const, message: "Thiếu key, label hoặc emoji." };
  }

  if (!Number.isFinite(sortOrder)) {
    return { ok: false as const, message: "Thứ tự hiển thị không hợp lệ." };
  }

  await db.execute(sql`
    update public.chapter_reaction_types
    set
      label = ${label},
      emoji = ${emoji},
      sort_order = ${Math.trunc(sortOrder)},
      is_enabled = ${isEnabled},
      updated_at = now()
    where key = ${key}
  `);

  await logAdminAction({
    action: "update_app_settings",
    actorId: guard.context.userId,
    targetType: "chapter_reaction_type",
    targetId: key,
    metadata: { label, emoji, sortOrder, isEnabled }
  });

  revalidatePath("/admin/engagement/reactions");
  revalidatePath("/", "layout");

  return { ok: true as const, message: "Đã lưu cảm xúc." };
}
