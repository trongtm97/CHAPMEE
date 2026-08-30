"use server";

import { revalidatePath } from "next/cache";
import {
  requireAnyPermission,
  requirePermission
} from "@/lib/auth/require-permission";
import {
  archiveCodeSnippet,
  createCodeSnippet,
  duplicateCodeSnippet,
  exportSnippetsByIds,
  importSnippetsBundle,
  rollbackCodeSnippet,
  setCodeSnippetStatus,
  updateCodeSnippet,
  type SnippetExportBundle
} from "@/lib/snippets/snippet-service";
import { updateCodeSnippetGlobalSettings } from "@/lib/snippets/settings";
import type { SnippetFormInput, SnippetStatus } from "@/lib/snippets/types";
import { validateSnippetInput } from "@/lib/snippets/validation";

export type SnippetActionState = {
  ok: boolean;
  error: string | null;
  id?: string;
  validationMessage?: string;
};

const SNIPPET_ADMIN_PATH = "/admin/developer/snippets";

function revalidateSnippetPages(id?: string) {
  revalidatePath(SNIPPET_ADMIN_PATH);
  if (id) {
    revalidatePath(`${SNIPPET_ADMIN_PATH}/${id}`);
    revalidatePath(`${SNIPPET_ADMIN_PATH}/${id}/versions`);
  }
  revalidatePath("/");
}

export async function saveSnippetAction(
  input: SnippetFormInput & { id?: string }
): Promise<SnippetActionState> {
  const isActivate = input.status === "active";
  const guard = await requireAnyPermission(
    isActivate
      ? ["admin.snippets.activate", "admin.snippets.update"]
      : ["admin.snippets.create", "admin.snippets.update"],
    { returnTo: SNIPPET_ADMIN_PATH }
  );
  if (!guard.ok) {
    return { ok: false, error: guard.error };
  }

  if (isActivate) {
    const activateGuard = await requirePermission("admin.snippets.activate", {
      returnTo: SNIPPET_ADMIN_PATH
    });
    if (!activateGuard.ok) {
      return { ok: false, error: activateGuard.error };
    }
  }

  const validation = validateSnippetInput(input);
  if (validation.blocked) {
    return { ok: false, error: validation.message, validationMessage: validation.message };
  }
  if (validation.requiresSuperConfirm && !input.confirmHighRisk) {
    const canSuper = guard.context!.permissions.includes("admin.user.role.assign");
    if (!canSuper) {
      return {
        ok: false,
        error: "Mẫu rủi ro cao — cần quyền super admin và xác nhận.",
        validationMessage: validation.message
      };
    }
  }

  try {
    const userId = guard.context!.userId;
    const row = input.id
      ? await updateCodeSnippet(input.id, input, userId)
      : await createCodeSnippet(input, userId);
    revalidateSnippetPages(row.id);
    return { ok: true, error: null, id: row.id, validationMessage: validation.message };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Không lưu được snippet.";
    return { ok: false, error: message };
  }
}

export async function setSnippetStatusAction(
  id: string,
  status: SnippetStatus
): Promise<SnippetActionState> {
  if (status === "active") {
    const guard = await requirePermission("admin.snippets.activate", {
      returnTo: SNIPPET_ADMIN_PATH
    });
    if (!guard.ok) return { ok: false, error: guard.error };
    try {
      await setCodeSnippetStatus(id, status, guard.context!.userId);
      revalidateSnippetPages(id);
      return { ok: true, error: null, id };
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : "Không đổi trạng thái."
      };
    }
  }

  const guard = await requirePermission("admin.snippets.update", {
    returnTo: SNIPPET_ADMIN_PATH
  });
  if (!guard.ok) return { ok: false, error: guard.error };

  try {
    await setCodeSnippetStatus(id, status, guard.context!.userId);
    revalidateSnippetPages(id);
    return { ok: true, error: null, id };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Không đổi trạng thái."
    };
  }
}

export async function duplicateSnippetAction(id: string): Promise<SnippetActionState> {
  const guard = await requirePermission("admin.snippets.create", {
    returnTo: SNIPPET_ADMIN_PATH
  });
  if (!guard.ok) return { ok: false, error: guard.error };
  try {
    const row = await duplicateCodeSnippet(id, guard.context!.userId);
    revalidateSnippetPages(row.id);
    return { ok: true, error: null, id: row.id };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Không nhân bản được."
    };
  }
}

export async function archiveSnippetAction(id: string): Promise<SnippetActionState> {
  const guard = await requirePermission("admin.snippets.delete", {
    returnTo: SNIPPET_ADMIN_PATH
  });
  if (!guard.ok) return { ok: false, error: guard.error };
  try {
    await archiveCodeSnippet(id, guard.context!.userId);
    revalidateSnippetPages(id);
    return { ok: true, error: null, id };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Không xoá được."
    };
  }
}

export async function rollbackSnippetAction(
  snippetId: string,
  versionId: string,
  changeNote?: string
): Promise<SnippetActionState> {
  const guard = await requirePermission("admin.snippets.rollback", {
    returnTo: SNIPPET_ADMIN_PATH
  });
  if (!guard.ok) return { ok: false, error: guard.error };
  try {
    const row = await rollbackCodeSnippet(
      snippetId,
      versionId,
      guard.context!.userId,
      changeNote
    );
    revalidateSnippetPages(row.id);
    return { ok: true, error: null, id: row.id };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Không rollback được."
    };
  }
}

export async function disableAllSnippetsAction(): Promise<SnippetActionState> {
  const guard = await requirePermission("admin.snippets.activate", {
    returnTo: SNIPPET_ADMIN_PATH
  });
  if (!guard.ok) return { ok: false, error: guard.error };
  try {
    await updateCodeSnippetGlobalSettings(
      { snippetsEnabled: false },
      guard.context!.userId
    );
    revalidateSnippetPages();
    return { ok: true, error: null };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Không tắt được safe mode."
    };
  }
}

export async function enableAllSnippetsAction(): Promise<SnippetActionState> {
  const guard = await requirePermission("admin.snippets.activate", {
    returnTo: SNIPPET_ADMIN_PATH
  });
  if (!guard.ok) return { ok: false, error: guard.error };
  try {
    await updateCodeSnippetGlobalSettings(
      { snippetsEnabled: true },
      guard.context!.userId
    );
    revalidateSnippetPages();
    return { ok: true, error: null };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Không bật lại được."
    };
  }
}

export async function exportSnippetsAction(ids: string[]) {
  const guard = await requirePermission("admin.snippets.import_export", {
    returnTo: SNIPPET_ADMIN_PATH
  });
  if (!guard.ok) {
    return { ok: false as const, error: guard.error, json: null };
  }
  const bundle = await exportSnippetsByIds(ids);
  return { ok: true as const, error: null, json: JSON.stringify(bundle, null, 2) };
}

export async function importSnippetsAction(
  rawJson: string
): Promise<SnippetActionState & { imported?: number }> {
  const guard = await requirePermission("admin.snippets.import_export", {
    returnTo: SNIPPET_ADMIN_PATH
  });
  if (!guard.ok) return { ok: false, error: guard.error };

  let bundle: SnippetExportBundle;
  try {
    bundle = JSON.parse(rawJson) as SnippetExportBundle;
  } catch {
    return { ok: false, error: "JSON không hợp lệ." };
  }

  if (!bundle?.snippets?.length) {
    return { ok: false, error: "Không có snippet trong file." };
  }

  try {
    const rows = await importSnippetsBundle(bundle, guard.context!.userId);
    revalidateSnippetPages();
    return { ok: true, error: null, imported: rows.length };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Import thất bại."
    };
  }
}

export async function validateSnippetPreviewAction(
  input: Pick<SnippetFormInput, "type" | "code" | "confirmHighRisk">
) {
  const guard = await requireAnyPermission(
    ["admin.snippets.view", "admin.snippets.create", "admin.snippets.update"],
    { returnTo: SNIPPET_ADMIN_PATH }
  );
  if (!guard.ok) {
    return {
      status: "block" as const,
      message: guard.error,
      warnings: [],
      blocked: true,
      requiresSuperConfirm: false
    };
  }
  return validateSnippetInput(input);
}
