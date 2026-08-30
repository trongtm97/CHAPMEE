"use server";

import { revalidatePath } from "next/cache";
import { assertStaffAnyPermission } from "@/lib/auth/staff-guards";
import { logAdminAction } from "@/lib/audit/log-admin-action";
import { createClient } from "@/lib/data/server";

export async function setCommunityTrustedAction(input: {
  userId: string;
  trusted: boolean;
  note?: string;
}): Promise<{ ok: boolean; error: string | null }> {
  try {
    const { userId: actorId } = await assertStaffAnyPermission([
      "community.post.moderate",
      "admin.settings.update"
    ]);
    const db = await createClient();

    const { error } = await db
      .from("profiles")
      .update({
        community_trusted: input.trusted,
        community_trust_note: input.note?.trim() || null
      })
      .eq("id", input.userId);

    if (error) return { ok: false, error: error.message };

    await logAdminAction({
      actorId,
      action: "community_spam_rule_updated",
      targetType: "profile",
      targetId: input.userId,
      metadata: {
        community_trusted: input.trusted,
        note: input.note ?? null
      }
    });

    revalidatePath("/admin/community");
    revalidatePath("/admin/community/auto-moderation");
    return { ok: true, error: null };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Không cập nhật được."
    };
  }
}
