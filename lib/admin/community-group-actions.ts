"use server";

import { revalidatePath } from "next/cache";
import { assertStaffAnyPermission } from "@/lib/auth/staff-guards";
import { logAdminAction } from "@/lib/audit/log-admin-action";
import { createClient } from "@/lib/data/server";
import { isMissingSchemaError } from "@/lib/data/schema-errors";

export type CommunityGroupAction =
  | "lock_posting"
  | "unlock_posting"
  | "restrict_posting"
  | "hide_from_recommendation"
  | "show_in_recommendation";

type GroupActionInput = {
  groupType: "story" | "author";
  groupId: string;
  action: CommunityGroupAction;
  label?: string;
};

async function requireGroupModerator() {
  return assertStaffAnyPermission([
    "community.group.moderate",
    "admin.settings.update"
  ]);
}

export async function communityGroupAction(
  input: GroupActionInput
): Promise<{ ok: boolean; error: string | null }> {
  try {
    const { userId } = await requireGroupModerator();
    const db = await createClient();
    const now = new Date().toISOString();

    let status = "active";
    let postingLocked = false;
    let hiddenFromRecommendation = false;
    let auditAction = "community_group_unrestricted";

    if (input.action === "lock_posting") {
      status = "posting_locked";
      postingLocked = true;
      auditAction = "community_group_restricted";
    } else if (input.action === "restrict_posting") {
      status = "posting_restricted";
      auditAction = "community_group_restricted";
    } else if (input.action === "hide_from_recommendation") {
      status = "hidden_from_recommendation";
      hiddenFromRecommendation = true;
      auditAction = "community_group_hidden_from_recommendation";
    } else if (input.action === "unlock_posting") {
      status = "active";
      postingLocked = false;
      auditAction = "community_group_unrestricted";
    } else if (input.action === "show_in_recommendation") {
      status = "active";
      hiddenFromRecommendation = false;
      auditAction = "community_group_unrestricted";
    }

    const row = {
      group_type: input.groupType,
      group_id: input.groupId,
      status,
      posting_locked: postingLocked,
      hidden_from_recommendation: hiddenFromRecommendation,
      updated_by: userId,
      updated_at: now
    };

    const { error } = await db.from("community_group_settings").upsert(row, {
      onConflict: "group_type,group_id"
    });

    if (error) {
      if (isMissingSchemaError(error)) {
        return {
          ok: false,
          error: "Bảng cấu hình nhóm chưa sẵn sàng. Chạy migration 096."
        };
      }
      return { ok: false, error: error.message };
    }

    await logAdminAction({
      actorId: userId,
      action: auditAction,
      targetType: "community_group",
      targetId: `${input.groupType}:${input.groupId}`,
      metadata: {
        label: input.label ?? null,
        status,
        action: input.action
      }
    });

    revalidatePath("/admin/community");
    return { ok: true, error: null };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Không cập nhật được nhóm."
    };
  }
}

export async function updateCommunitySpamSettingsAction(
  settings: Record<string, unknown>
): Promise<{ ok: boolean; error: string | null }> {
  try {
    const { userId } = await assertStaffAnyPermission(["admin.settings.update"]);
    const db = await createClient();

    const { error } = await db.from("app_settings").upsert(
      {
        key: "community_spam_settings",
        value: settings,
        is_public: false,
        updated_by: userId,
        updated_at: new Date().toISOString()
      },
      { onConflict: "key" }
    );

    if (error) return { ok: false, error: error.message };

    await logAdminAction({
      actorId: userId,
      action: "community_spam_rule_updated",
      targetType: "app_settings",
      targetId: "community_spam_settings",
      metadata: settings
    });

    revalidatePath("/admin/community");
    return { ok: true, error: null };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Không lưu được cấu hình."
    };
  }
}
