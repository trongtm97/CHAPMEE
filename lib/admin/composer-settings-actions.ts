"use server";

import { revalidatePath } from "next/cache";
import { logAdminAction } from "@/lib/audit/log-admin-action";
import { getAdminAuditLogs } from "@/lib/admin/get-audit-logs";
import {
  getDefaultComposerAdminSettings,
  mergeBlockTypeSettings,
  mergeModeSettings,
  mergeValidationSettings,
  type ComposerAdminSettingsBundle,
  type ComposerBlockTypeRegistryEntry,
  type ComposerModeRegistryEntry,
  type ComposerValidationSettings
} from "@/lib/composer/composer-settings-defaults";
import { checkStaffAnyPermission } from "@/lib/auth/staff-guards";
import { createClient } from "@/lib/data/server";
import { listFormatTemplatesForAdmin } from "@/lib/taxonomy/admin-data";
import { resolveComposerTemplateDocument } from "@/lib/composer/template-validation";

async function assertAdmin() {
  const guard = await checkStaffAnyPermission([
    "taxonomy.view",
    "taxonomy.templates.manage",
    "admin.settings.update"
  ]);
  if (!guard.ok) {
    return { error: guard.error ?? "Không có quyền.", db: null as never, userId: null };
  }
  const db = await createClient();
  return { error: null, db, userId: guard.userId };
}

export async function loadComposerAdminSettingsAction(): Promise<{
  error: string | null;
  settings: ComposerAdminSettingsBundle;
}> {
  const auth = await assertAdmin();
  if (auth.error) {
    return { error: auth.error, settings: getDefaultComposerAdminSettings() };
  }

  const { data, error } = await auth.db.from("composer_settings").select("key, value");

  if (error) {
    return { error: error.message, settings: getDefaultComposerAdminSettings() };
  }

  const byKey = new Map((data ?? []).map((row) => [String(row.key), row.value]));
  const templates = await listFormatTemplatesForAdmin();

  return {
    error: null,
    settings: {
      validation: mergeValidationSettings(byKey.get("validation")),
      modes: mergeModeSettings(byKey.get("modes")),
      blockTypes: mergeBlockTypeSettings(byKey.get("block_types")),
      templates: templates.items.map((item) => {
        const resolved = resolveComposerTemplateDocument(item.mode, item.example_json ?? null);
        return {
          id: item.id,
          name: item.name,
          slug: item.name.toLowerCase().replace(/\s+/g, "-"),
          mode_key: resolved.doc.mode,
          content_structure: "both" as const,
          description: item.description,
          starter_blocks_json: resolved.doc,
          preview_text:
            resolved.errors[0] ?? resolved.warnings[0] ?? item.description ?? null,
          active: item.is_active && resolved.ok,
          creator_selectable: true,
          sort_order: item.sort_order,
          updated_at: item.updated_at
        };
      })
    }
  };
}

export async function validateComposerTemplatesAction(): Promise<{
  error: string | null;
  total: number;
  valid: number;
  invalid: number;
  warnings: number;
  items: Array<{
    id: string;
    name: string;
    mode: string;
    source: string;
    ok: boolean;
    errors: string[];
    warnings: string[];
  }>;
}> {
  const auth = await assertAdmin();
  if (auth.error) {
    return {
      error: auth.error,
      total: 0,
      valid: 0,
      invalid: 0,
      warnings: 0,
      items: []
    };
  }

  const templates = await listFormatTemplatesForAdmin();
  if (templates.error) {
    return {
      error: templates.error,
      total: 0,
      valid: 0,
      invalid: 0,
      warnings: 0,
      items: []
    };
  }

  const items = templates.items.map((item) => {
    const resolved = resolveComposerTemplateDocument(item.mode, item.example_json ?? null);
    return {
      id: item.id,
      name: item.name,
      mode: resolved.doc.mode,
      source: resolved.source,
      ok: resolved.ok,
      errors: resolved.errors,
      warnings: resolved.warnings
    };
  });

  return {
    error: null,
    total: items.length,
    valid: items.filter((item) => item.ok).length,
    invalid: items.filter((item) => !item.ok).length,
    warnings: items.filter((item) => item.warnings.length > 0).length,
    items
  };
}

async function upsertSetting(
  db: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  key: string,
  value: unknown
) {
  const { error } = await db.from("composer_settings").upsert(
    {
      key,
      value,
      updated_by: userId
    },
    { onConflict: "key" }
  );
  return error;
}

export async function saveComposerValidationSettingsAction(
  settings: ComposerValidationSettings
): Promise<{ error: string | null }> {
  const auth = await assertAdmin();
  if (auth.error) {
    return { error: auth.error };
  }

  const error = await upsertSetting(auth.db, auth.userId!, "validation", settings);
  if (error) {
    return { error: error.message };
  }

  await logAdminAction({
    actorId: auth.userId!,
    action: "update_app_settings",
    targetType: "composer_settings",
    targetId: "validation",
    metadata: { keys: Object.keys(settings) }
  });

  revalidatePath("/admin/story-formats");
  return { error: null };
}

export async function restoreComposerDefaultsAction(): Promise<{
  error: string | null;
}> {
  const auth = await assertAdmin();
  if (auth.error) {
    return { error: auth.error };
  }
  const defaults = getDefaultComposerAdminSettings();
  const validationError = await upsertSetting(
    auth.db,
    auth.userId!,
    "validation",
    defaults.validation
  );
  if (validationError) return { error: validationError.message };
  const modeError = await upsertSetting(auth.db, auth.userId!, "modes", defaults.modes);
  if (modeError) return { error: modeError.message };
  const blockError = await upsertSetting(
    auth.db,
    auth.userId!,
    "block_types",
    defaults.blockTypes
  );
  if (blockError) return { error: blockError.message };

  await logAdminAction({
    actorId: auth.userId!,
    action: "update_app_settings",
    targetType: "composer_settings",
    targetId: "restore_defaults",
    metadata: { keys: ["validation", "modes", "block_types"] }
  });
  revalidatePath("/admin/story-formats");
  return { error: null };
}

export async function saveComposerModesAction(
  modes: ComposerModeRegistryEntry[]
): Promise<{ error: string | null }> {
  const auth = await assertAdmin();
  if (auth.error) {
    return { error: auth.error };
  }

  const error = await upsertSetting(auth.db, auth.userId!, "modes", modes);
  if (error) {
    return { error: error.message };
  }

  await logAdminAction({
    actorId: auth.userId!,
    action: "update_app_settings",
    targetType: "composer_settings",
    targetId: "modes",
    metadata: { count: modes.length }
  });

  revalidatePath("/admin/story-formats");
  return { error: null };
}

export async function saveComposerBlockTypesAction(
  blockTypes: ComposerBlockTypeRegistryEntry[]
): Promise<{ error: string | null }> {
  const auth = await assertAdmin();
  if (auth.error) {
    return { error: auth.error };
  }

  const error = await upsertSetting(auth.db, auth.userId!, "block_types", blockTypes);
  if (error) {
    return { error: error.message };
  }

  await logAdminAction({
    actorId: auth.userId!,
    action: "update_app_settings",
    targetType: "composer_settings",
    targetId: "block_types",
    metadata: { count: blockTypes.length }
  });

  revalidatePath("/admin/story-formats");
  return { error: null };
}

export async function exportComposerSettingsAction(): Promise<{
  error: string | null;
  payload: string | null;
}> {
  const result = await loadComposerAdminSettingsAction();
  if (result.error) {
    return { error: result.error, payload: null };
  }
  return {
    error: null,
    payload: JSON.stringify(
      {
        exported_at: new Date().toISOString(),
        ...result.settings
      },
      null,
      2
    )
  };
}

export async function importComposerSettingsAction(input: {
  payload: string;
}): Promise<{ error: string | null }> {
  const auth = await assertAdmin();
  if (auth.error) {
    return { error: auth.error };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(input.payload);
  } catch {
    return { error: "JSON cấu hình không hợp lệ." };
  }
  if (!parsed || typeof parsed !== "object") {
    return { error: "Payload cấu hình không hợp lệ." };
  }
  const record = parsed as Record<string, unknown>;
  const validation = mergeValidationSettings(record.validation);
  const modes = mergeModeSettings(record.modes);
  const blockTypes = mergeBlockTypeSettings(record.blockTypes ?? record.block_types);

  const validationError = await upsertSetting(
    auth.db,
    auth.userId!,
    "validation",
    validation
  );
  if (validationError) return { error: validationError.message };
  const modeError = await upsertSetting(auth.db, auth.userId!, "modes", modes);
  if (modeError) return { error: modeError.message };
  const blockError = await upsertSetting(auth.db, auth.userId!, "block_types", blockTypes);
  if (blockError) return { error: blockError.message };

  await logAdminAction({
    actorId: auth.userId!,
    action: "update_app_settings",
    targetType: "composer_settings",
    targetId: "import",
    metadata: { imported: true }
  });

  revalidatePath("/admin/story-formats");
  return { error: null };
}

export async function listComposerAuditLogsAction(input?: {
  page?: number;
  action?: string;
}): Promise<{
  error: string | null;
  total: number;
  logs: Awaited<ReturnType<typeof getAdminAuditLogs>>["logs"];
}> {
  try {
    const result = await getAdminAuditLogs({
      page: input?.page ?? 1,
      pageSize: 25,
      action: input?.action,
      targetType: "composer_settings"
    });
    return { error: result.error, total: result.total, logs: result.logs };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Không tải được audit log.",
      total: 0,
      logs: []
    };
  }
}
