"use server";

import { revalidateTag } from "next/cache";
import { createAdminAuditLog } from "@/lib/admin/create-audit-log";
import {
  CONTENT_QUALITY_SETTINGS_CACHE_TAG,
  CONTENT_QUALITY_SETTINGS_KEY,
  getQualityConfig,
  parseQualityConfigDb
} from "@/lib/content-quality/get-quality-config";
import { checkStaffPermission } from "@/lib/auth/staff-guards";
import { fetchAppSettingByKey } from "@/lib/supabase/app-settings";
import { createClient } from "@/lib/supabase/server";
import type { ContentQualityConfig } from "@/types/content-quality";

export type QualityConfigFormState = {
  minRatingsForQualityAction: number;
  lowRatingThreshold: number;
  minReportsForReview: number;
  earlyDropThreshold: number;
  requireModeratorConfirmationForPenalty: boolean;
  maxLowQualityAttempts: number;
  permanentHideAfterMaxAttempts: boolean;
  disableMonetizationAfterPermanentHide: boolean;
  minContentWordsStory: number;
  minContentWordsChapter: number;
};

export async function updateQualityConfigAction(
  input: QualityConfigFormState
): Promise<{ ok: boolean; error?: string }> {
  const auth = await checkStaffPermission("admin.settings.update");
  if (!auth.ok) {
    return { ok: false, error: auth.error };
  }

  const before = await getQualityConfig({ useCache: false });

  const payload = {
    min_ratings_for_quality_action: input.minRatingsForQualityAction,
    low_rating_threshold: input.lowRatingThreshold,
    min_reports_for_review: input.minReportsForReview,
    early_drop_threshold: input.earlyDropThreshold,
    require_moderator_confirmation_for_penalty: input.requireModeratorConfirmationForPenalty,
    max_low_quality_attempts: input.maxLowQualityAttempts,
    permanent_hide_after_max_attempts: input.permanentHideAfterMaxAttempts,
    disable_monetization_after_permanent_hide: input.disableMonetizationAfterPermanentHide,
    min_content_words_story: input.minContentWordsStory,
    min_content_words_chapter: input.minContentWordsChapter
  };

  const supabase = await createClient();
  const { error: saveError } = await supabase.from("app_settings").upsert(
    {
      key: CONTENT_QUALITY_SETTINGS_KEY,
      value: payload,
      is_public: true,
      updated_at: new Date().toISOString()
    },
    { onConflict: "key" }
  );

  if (saveError) {
    return { ok: false, error: saveError.message };
  }

  revalidateTag(CONTENT_QUALITY_SETTINGS_CACHE_TAG, "max");

  await createAdminAuditLog({
    actorId: auth.userId,
    action: "update_app_settings",
    targetType: "content_quality_settings",
    targetId: CONTENT_QUALITY_SETTINGS_KEY,
    before: before as unknown as Record<string, unknown>,
    after: parseQualityConfigDb(payload) as unknown as Record<string, unknown>
  });

  return { ok: true };
}

export async function getQualityConfigForAdmin(): Promise<ContentQualityConfig & QualityConfigFormState> {
  const config = await getQualityConfig({ useCache: false });
  const row = await fetchAppSettingByKey(CONTENT_QUALITY_SETTINGS_KEY);
  const raw =
    row?.value && typeof row.value === "object"
      ? (row.value as Record<string, unknown>)
      : {};

  return {
    ...config,
    maxLowQualityAttempts: Number(raw.max_low_quality_attempts ?? 3),
    permanentHideAfterMaxAttempts: Boolean(raw.permanent_hide_after_max_attempts ?? true),
    disableMonetizationAfterPermanentHide: Boolean(
      raw.disable_monetization_after_permanent_hide ?? true
    )
  };
}
