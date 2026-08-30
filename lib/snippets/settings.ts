import "server-only";

import { sql } from "drizzle-orm";
import { isNextBuildPhase, isOfflineDbError } from "@/lib/build/is-build-time";
import { db } from "@/lib/db";
import { createClient } from "@/lib/data/server";
import { isMissingSchemaError } from "@/lib/data/schema-errors";
import { APP_SETTING_SNIPPETS_KEY } from "@/lib/snippets/constants";

export type CodeSnippetGlobalSettings = {
  snippetsEnabled: boolean;
};

const DEFAULTS: CodeSnippetGlobalSettings = {
  snippetsEnabled: true
};

function mapValue(value: unknown): CodeSnippetGlobalSettings {
  if (!value || typeof value !== "object") {
    return DEFAULTS;
  }
  const row = value as Record<string, unknown>;
  return {
    snippetsEnabled:
      row.snippets_enabled !== undefined
        ? Boolean(row.snippets_enabled)
        : row.snippetsEnabled !== undefined
          ? Boolean(row.snippetsEnabled)
          : DEFAULTS.snippetsEnabled
  };
}

export function isSnippetsDisabledByEnv() {
  return process.env.CHAPMEE_DISABLE_SNIPPETS === "true";
}

export async function getCodeSnippetGlobalSettings(): Promise<CodeSnippetGlobalSettings> {
  if (isSnippetsDisabledByEnv() || isNextBuildPhase()) {
    return { snippetsEnabled: false };
  }

  try {
    const result = await db.execute(sql`
      select value
      from public.app_settings
      where key = ${APP_SETTING_SNIPPETS_KEY}
      limit 1
    `);
    const row = result.rows[0] as { value?: unknown } | undefined;
    return mapValue(row?.value);
  } catch (error) {
    if (isMissingSchemaError(error) || isOfflineDbError(error)) {
      return DEFAULTS;
    }
    throw error;
  }
}

export async function updateCodeSnippetGlobalSettings(
  patch: Partial<CodeSnippetGlobalSettings>,
  updatedBy: string | null
) {
  const current = await getCodeSnippetGlobalSettings();
  const next = { ...current, ...patch };
  const supabase = await createClient();
  const { error } = await supabase.from("app_settings").upsert(
    {
      key: APP_SETTING_SNIPPETS_KEY,
      value: { snippets_enabled: next.snippetsEnabled },
      is_public: false,
      updated_by: updatedBy,
      updated_at: new Date().toISOString()
    },
    { onConflict: "key" }
  );
  if (error) {
    throw new Error(error.message);
  }
  return next;
}

export async function isSnippetRenderingEnabled() {
  if (isSnippetsDisabledByEnv()) {
    return false;
  }
  const settings = await getCodeSnippetGlobalSettings();
  return settings.snippetsEnabled;
}
