"use server";

import { revalidatePath } from "next/cache";
import { createAdminAuditLog } from "@/lib/admin/create-audit-log";
import { checkStaffPermission } from "@/lib/auth/staff-guards";
import {
  loadTaxonomyQualityRules,
  runTaxonomyQualityBatchCheck,
  runTaxonomyQualityCheckForStory
} from "@/lib/content-taxonomy-quality/rule-engine";
import { isPresentationModeSupportedByComposer } from "@/lib/taxonomy/presentation-bridge";
import { setStoryTaxonomy } from "@/lib/taxonomy/story-taxonomy";
import { createClient } from "@/lib/data/server";
import { createAdminClient } from "@/lib/data/admin";
import type {
  TaxonomyQualityFlagStatus,
  TaxonomyQualityFlagType,
  TaxonomyQualitySeverity
} from "@/types/content-taxonomy-quality";
import type { StoryTaxonomySelectionInput, TaxonomyType } from "@/types/taxonomy";

async function requireTaxonomyQualityPermission(code: import("@/types/permissions").PermissionCode) {
  const guard = await checkStaffPermission(code);
  if (!guard.ok) {
    return { ok: false as const, error: guard.error ?? "Không có quyền." };
  }
  return { ok: true as const, userId: guard.userId };
}

export async function runTaxonomyQualityCheckAction(options?: {
  storyId?: string;
  batchLimit?: number;
}) {
  const guard = await requireTaxonomyQualityPermission(
    "content_taxonomy_quality.manage_rules"
  );
  if (!guard.ok) return guard;

  const db = createAdminClient();
  if (options?.storyId) {
    const rules = await loadTaxonomyQualityRules(db);
    const result = await runTaxonomyQualityCheckForStory(
      db,
      options.storyId,
      rules
    );
    if (!result.ok) return { ok: false, error: result.error };
  } else {
    const result = await runTaxonomyQualityBatchCheck(db, {
      limit: options?.batchLimit ?? 200
    });
    if (!result.ok) return { ok: false, error: result.error };
  }

  await createAdminAuditLog({
    action: "taxonomy_quality_check_run",
    targetType: "taxonomy_quality",
    targetId: options?.storyId ?? "batch",
    metadata: { batchLimit: options?.batchLimit ?? 200 }
  });

  revalidatePath("/admin/content-taxonomy-quality");
  return { ok: true, error: null };
}

export async function updateTaxonomyQualityFlagStatusAction(input: {
  flagId: string;
  status: TaxonomyQualityFlagStatus;
  note?: string;
}) {
  const guard = await requireTaxonomyQualityPermission(
    "content_taxonomy_quality.review"
  );
  if (!guard.ok) return guard;

  const db = await createClient();
  const {
    data: { user }
  } = await db.auth.getUser();
  if (!user) return { ok: false, error: "Chưa đăng nhập." };

  const patch: Record<string, unknown> = {
    status: input.status,
    reviewed_by: user.id,
    reviewed_at: new Date().toISOString()
  };
  if (input.status === "resolved" || input.status === "dismissed") {
    patch.resolved_at = new Date().toISOString();
  }

  const { data: flag, error } = await db
    .from("content_taxonomy_quality_flags")
    .update(patch)
    .eq("id", input.flagId)
    .select("story_id, flag_type")
    .single();

  if (error || !flag) {
    return { ok: false, error: error?.message ?? "Không cập nhật được cờ chất lượng." };
  }

  await createAdminAuditLog({
    action:
      input.status === "dismissed"
        ? "taxonomy_quality_flag_dismissed"
        : "taxonomy_quality_flag_resolved",
    targetType: "story",
    targetId: String(flag.story_id),
    metadata: {
      flagId: input.flagId,
      flagType: flag.flag_type,
      status: input.status,
      note: input.note ?? null
    }
  });

  revalidatePath("/admin/content-taxonomy-quality");
  return { ok: true, error: null };
}

export async function adminEditStoryTaxonomyAction(input: {
  storyId: string;
  flagId?: string;
  note: string;
  presentationMode?: string;
  contentWarningsConfirmed?: boolean;
  selections: Partial<Record<TaxonomyType, string[]>>;
  resolveFlag?: boolean;
}) {
  const guard = await requireTaxonomyQualityPermission(
    "content_taxonomy_quality.edit_story_taxonomy"
  );
  if (!guard.ok) return guard;

  if (input.presentationMode && !isPresentationModeSupportedByComposer(input.presentationMode)) {
    return {
      ok: false,
      error: `Presentation mode "${input.presentationMode}" không được Composer hỗ trợ — chọn mode khác.`
    };
  }

  const taxonomyInput: StoryTaxonomySelectionInput = {
    selections: input.selections,
    presentationMode: input.presentationMode,
    contentWarningsConfirmed: input.contentWarningsConfirmed
  };

  const result = await setStoryTaxonomy(input.storyId, taxonomyInput, {
    allowAdminTypes: true
  });

  if (!result.ok) {
    return { ok: false, error: result.error };
  }

  const db = await createClient();
  const {
    data: { user }
  } = await db.auth.getUser();

  await createAdminAuditLog({
    action: "taxonomy_quality_admin_edit_taxonomy",
    targetType: "story",
    targetId: input.storyId,
    metadata: {
      note: input.note,
      presentationMode: input.presentationMode ?? null,
      selections: input.selections,
      flagId: input.flagId ?? null
    }
  });

  if (input.resolveFlag && input.flagId) {
    await db
      .from("content_taxonomy_quality_flags")
      .update({
        status: "resolved",
        reviewed_by: user?.id ?? null,
        reviewed_at: new Date().toISOString(),
        resolved_at: new Date().toISOString()
      })
      .eq("id", input.flagId);
  }

  const admin = createAdminClient();
  const rules = await loadTaxonomyQualityRules(admin);
  await runTaxonomyQualityCheckForStory(admin, input.storyId, rules);

  revalidatePath("/admin/content-taxonomy-quality");
  revalidatePath(`/admin/content/stories/${input.storyId}`);
  return { ok: true, error: null };
}

export async function sendCreatorTaxonomyRevisionRequestAction(input: {
  storyId: string;
  creatorId: string;
  reason: string;
  requiredChanges?: Record<string, unknown>;
  flagId?: string;
  dueAt?: string;
}) {
  const guard = await requireTaxonomyQualityPermission(
    "content_taxonomy_quality.request_creator_revision"
  );
  if (!guard.ok) return guard;

  const db = await createClient();
  const {
    data: { user }
  } = await db.auth.getUser();
  if (!user) return { ok: false, error: "Chưa đăng nhập." };

  const { data: request, error } = await db
    .from("creator_taxonomy_revision_requests")
    .insert({
      story_id: input.storyId,
      creator_id: input.creatorId,
      requested_by: user.id,
      reason: input.reason.trim(),
      required_changes_json: input.requiredChanges ?? {},
      due_at: input.dueAt ?? null,
      status: "open"
    })
    .select("id")
    .single();

  if (error || !request) {
    return { ok: false, error: error?.message ?? "Không tạo được yêu cầu chỉnh taxonomy." };
  }

  const { data: story } = await db
    .from("stories")
    .select("title, creator_id")
    .eq("id", input.storyId)
    .maybeSingle();

  if (story?.creator_id) {
    const { notifyCreatorTaxonomyRevisionRequested } = await import(
      "@/lib/content-taxonomy-quality/notify-creator"
    );
    await notifyCreatorTaxonomyRevisionRequested({
      creatorUserId: String(story.creator_id),
      storyId: input.storyId,
      storyTitle: String(story.title),
      reason: input.reason.trim(),
      requestId: request.id
    });
  }

  if (input.flagId) {
    await db
      .from("content_taxonomy_quality_flags")
      .update({ status: "sent_to_creator" })
      .eq("id", input.flagId);
  }

  await createAdminAuditLog({
    action: "taxonomy_quality_revision_requested",
    targetType: "story",
    targetId: input.storyId,
    metadata: {
      requestId: request.id,
      reason: input.reason,
      requiredChanges: input.requiredChanges ?? {}
    }
  });

  revalidatePath("/admin/content-taxonomy-quality");
  revalidatePath("/studio/content-health");
  return { ok: true, error: null, requestId: request.id };
}

export async function updateTaxonomyQualityRuleAction(input: {
  ruleId: string;
  isEnabled?: boolean;
  severity?: TaxonomyQualitySeverity;
  config?: Record<string, unknown>;
}) {
  const guard = await requireTaxonomyQualityPermission(
    "content_taxonomy_quality.manage_rules"
  );
  if (!guard.ok) return guard;

  const db = await createClient();
  const patch: Record<string, unknown> = {};
  if (input.isEnabled != null) patch.is_enabled = input.isEnabled;
  if (input.severity) patch.severity = input.severity;
  if (input.config) patch.config_json = input.config;

  const { data: rule, error } = await db
    .from("taxonomy_quality_rules")
    .update(patch)
    .eq("id", input.ruleId)
    .select("rule_key, config_json, is_enabled")
    .single();

  if (error || !rule) {
    return { ok: false, error: error?.message ?? "Không cập nhật được rule." };
  }

  await createAdminAuditLog({
    action: "taxonomy_quality_rule_updated",
    targetType: "taxonomy_quality_rule",
    targetId: input.ruleId,
    metadata: {
      ruleKey: rule.rule_key,
      isEnabled: rule.is_enabled,
      config: rule.config_json
    }
  });

  revalidatePath("/admin/content-taxonomy-quality");
  return { ok: true, error: null };
}

export async function reviewCreatorTaxonomyRevisionAction(input: {
  requestId: string;
  status: "approved" | "rejected";
  note?: string;
}) {
  const guard = await requireTaxonomyQualityPermission(
    "content_taxonomy_quality.review"
  );
  if (!guard.ok) return guard;

  const db = await createClient();
  const {
    data: { user }
  } = await db.auth.getUser();

  const { data: request, error } = await db
    .from("creator_taxonomy_revision_requests")
    .update({
      status: input.status,
      reviewed_by: user?.id ?? null,
      reviewed_at: new Date().toISOString()
    })
    .eq("id", input.requestId)
    .select("story_id, creator_id")
    .single();

  if (error || !request) {
    return { ok: false, error: error?.message ?? "Không cập nhật được yêu cầu." };
  }

  const { data: story } = await db
    .from("stories")
    .select("title")
    .eq("id", request.story_id)
    .maybeSingle();

  const { notifyCreatorTaxonomyRevisionReviewed } = await import(
    "@/lib/content-taxonomy-quality/notify-creator"
  );
  if (request.creator_id && story?.title) {
    await notifyCreatorTaxonomyRevisionReviewed({
      creatorUserId: String(request.creator_id),
      storyId: String(request.story_id),
      storyTitle: String(story.title),
      approved: input.status === "approved"
    });
  }

  await createAdminAuditLog({
    action:
      input.status === "approved"
        ? "taxonomy_quality_revision_approved"
        : "taxonomy_quality_revision_rejected",
    targetType: "story",
    targetId: String(request.story_id),
    metadata: { requestId: input.requestId, note: input.note ?? null }
  });

  if (input.status === "approved") {
    const admin = createAdminClient();
    const rules = await loadTaxonomyQualityRules(admin);
    await runTaxonomyQualityCheckForStory(admin, String(request.story_id), rules);
  }

  revalidatePath("/admin/content-taxonomy-quality");
  revalidatePath("/studio/content-health");
  return { ok: true, error: null };
}

export async function creatorSubmitTaxonomyRevisionAction(input: {
  requestId: string;
  note?: string;
}) {
  const db = await createClient();
  const {
    data: { user }
  } = await db.auth.getUser();
  if (!user) return { ok: false, error: "Chưa đăng nhập." };

  const { data: request, error } = await db
    .from("creator_taxonomy_revision_requests")
    .update({
      status: "creator_submitted",
      creator_note: input.note?.trim() || null,
      creator_submitted_at: new Date().toISOString()
    })
    .eq("id", input.requestId)
    .eq("creator_id", user.id)
    .eq("status", "open")
    .select("story_id")
    .single();

  if (error || !request) {
    return { ok: false, error: error?.message ?? "Không gửi được bản chỉnh." };
  }

  const admin = createAdminClient();
  const rules = await loadTaxonomyQualityRules(admin);
  await runTaxonomyQualityCheckForStory(admin, String(request.story_id), rules);

  await createAdminAuditLog({
    action: "taxonomy_quality_revision_submitted",
    targetType: "story",
    targetId: String(request.story_id),
    metadata: { requestId: input.requestId, note: input.note ?? null }
  });

  revalidatePath("/studio/content-health");
  return { ok: true, error: null };
}

export async function createManualTaxonomyQualityFlagAction(input: {
  storyIdOrSlug: string;
  reason: string;
  severity?: TaxonomyQualitySeverity;
}) {
  const guard = await requireTaxonomyQualityPermission(
    "content_taxonomy_quality.review"
  );
  if (!guard.ok) return guard;

  const trimmed = input.storyIdOrSlug.trim();
  if (!trimmed) return { ok: false, error: "Nhập ID hoặc slug truyện." };

  const db = await createClient();
  const admin = createAdminClient();

  const { data: story } = await admin
    .from("stories")
    .select("id, title, slug")
    .or(`id.eq.${trimmed},slug.eq.${trimmed}`)
    .maybeSingle();

  if (!story?.id) {
    return { ok: false, error: "Không tìm thấy truyện." };
  }

  const {
    data: { user }
  } = await db.auth.getUser();

  const { error } = await db.from("content_taxonomy_quality_flags").insert({
    story_id: story.id,
    flag_type: "admin_manual",
    severity: input.severity ?? "medium",
    reason: input.reason.trim(),
    details_json: { note: input.reason.trim(), storyTitle: story.title },
    detected_by: "admin",
    created_by: user?.id ?? null,
    status: "open"
  });

  if (error) return { ok: false, error: error.message };

  await createAdminAuditLog({
    action: "taxonomy_quality_flag_manual_created",
    targetType: "story",
    targetId: String(story.id),
    metadata: {
      reason: input.reason,
      severity: input.severity ?? "medium",
      storySlug: story.slug
    }
  });

  revalidatePath("/admin/content-taxonomy-quality");
  return { ok: true, error: null, storyId: String(story.id) };
}
