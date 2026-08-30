"use server";

import { revalidatePath } from "next/cache";
import { logAdminAction } from "@/lib/audit/log-admin-action";
import { assertStaffAnyPermission } from "@/lib/auth/staff-guards";
import { rebuildGroupFeedProjection } from "@/lib/community-sync/rebuild-group-feed-projection";
import { backfillStoryGroupsForPublishedStories } from "@/lib/community-sync/story-groups";
import {
  clampCommunitySyncSettings,
  COMMUNITY_SYNC_SETTING_KEYS
} from "@/lib/community-sync/settings";
import {
  getCommunitySyncSettings,
  getCommunitySyncSettingsWithMeta,
  upsertCommunitySyncSettings
} from "@/lib/community-sync/sync-settings";
import type {
  BackfillStoryGroupsResult,
  CommunitySyncSettings,
  RebuildGroupFeedProjectionResult
} from "@/types/story-community-sync";

export type StoryCommunitySyncSettingsActionState = {
  ok: boolean;
  message: string | null;
  settings: CommunitySyncSettings;
  updatedAt: string | null;
};

export async function getStoryCommunitySyncAdminPageData() {
  const meta = await getCommunitySyncSettingsWithMeta();
  return meta;
}

function diffSettings(
  before: CommunitySyncSettings,
  after: CommunitySyncSettings
): Array<{ key: string; oldValue: unknown; newValue: unknown }> {
  const changes: Array<{ key: string; oldValue: unknown; newValue: unknown }> = [];

  for (const [prop, dbKey] of Object.entries(COMMUNITY_SYNC_SETTING_KEYS)) {
    const typedProp = prop as keyof CommunitySyncSettings;
    if (before[typedProp] !== after[typedProp]) {
      changes.push({
        key: dbKey,
        oldValue: before[typedProp],
        newValue: after[typedProp]
      });
    }
  }

  return changes;
}

export async function saveStoryCommunitySyncSettingsAction(
  settings: CommunitySyncSettings
): Promise<StoryCommunitySyncSettingsActionState> {
  try {
    const { userId } = await assertStaffAnyPermission(["admin.settings.update"]);
    const before = await getCommunitySyncSettings();
    const normalized = clampCommunitySyncSettings(settings);
    const result = await upsertCommunitySyncSettings(normalized, userId);

    if (!result.ok) {
      return {
        ok: false,
        message: result.error,
        settings: before,
        updatedAt: null
      };
    }

    const changes = diffSettings(before, result.settings);

    for (const change of changes) {
      await logAdminAction({
        actorId: userId,
        action: "community_sync_setting_updated",
        targetType: "community_sync_settings",
        targetId: change.key,
        metadata: {
          setting_key: change.key,
          old_value: change.oldValue,
          new_value: change.newValue,
          changed_at: new Date().toISOString()
        }
      });
    }

    if (changes.length === 0) {
      await logAdminAction({
        actorId: userId,
        action: "community_sync_settings_saved",
        targetType: "community_sync_settings",
        targetId: "all",
        metadata: { note: "no_changes" }
      });
    }

    revalidatePath("/admin/community/story-sync");

    return {
      ok: true,
      message: "Đã lưu cấu hình đồng bộ nhóm truyện.",
      settings: result.settings,
      updatedAt: new Date().toISOString()
    };
  } catch (error) {
    const fallback = await getCommunitySyncSettings();
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Không lưu được cấu hình.",
      settings: fallback,
      updatedAt: null
    };
  }
}

export type StoryCommunitySyncToolResult = {
  ok: boolean;
  error: string | null;
  backfill?: BackfillStoryGroupsResult;
  rebuild?: RebuildGroupFeedProjectionResult;
};

export async function runStoryGroupBackfillToolAction(input: {
  dryRun: boolean;
  confirm?: string;
}): Promise<StoryCommunitySyncToolResult> {
  try {
    const { userId } = await assertStaffAnyPermission(["admin.settings.update"]);

    if (!input.dryRun && input.confirm !== "BACKFILL") {
      return {
        ok: false,
        error: "Nhập BACKFILL để xác nhận backfill thật."
      };
    }

    const result = await backfillStoryGroupsForPublishedStories({
      dryRun: input.dryRun
    });

    await logAdminAction({
      actorId: userId,
      action: input.dryRun
        ? "community_sync_backfill_dry_run"
        : "community_sync_backfill_apply",
      targetType: "story_groups",
      targetId: "published_stories",
      metadata: result
    });

    revalidatePath("/admin/community/story-sync");

    return { ok: true, error: null, backfill: result };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Backfill thất bại."
    };
  }
}

export async function runRebuildGroupFeedProjectionToolAction(input: {
  dryRun: boolean;
  confirm?: string;
  limit?: number;
}): Promise<StoryCommunitySyncToolResult> {
  try {
    const { userId } = await assertStaffAnyPermission(["admin.settings.update"]);

    if (!input.dryRun && input.confirm !== "REBUILD") {
      return {
        ok: false,
        error: "Nhập REBUILD để xác nhận rebuild projection thật."
      };
    }

    const result = await rebuildGroupFeedProjection({
      dryRun: input.dryRun,
      batchSize: input.limit ?? 500,
      maxBatches: 20
    });

    await logAdminAction({
      actorId: userId,
      action: input.dryRun
        ? "community_sync_rebuild_projection_dry_run"
        : "community_sync_rebuild_projection_apply",
      targetType: "group_feed_items",
      targetId: "projection",
      metadata: result
    });

    revalidatePath("/admin/community/story-sync");

    return { ok: true, error: null, rebuild: result };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Rebuild projection thất bại."
    };
  }
}
