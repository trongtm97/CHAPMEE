import { eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { communitySyncSettings } from "@/lib/db/schema/story-community-sync";
import {
  communitySyncSettingsToRows,
  DEFAULT_COMMUNITY_SYNC_SETTINGS,
  mergeCommunitySyncSettings
} from "@/lib/community-sync/sync-settings-defaults";
import { clampCommunitySyncSettings } from "@/lib/community-sync/settings";
import { isMissingSchemaError } from "@/lib/data/schema-errors";
import type { CommunitySyncSettings } from "@/types/story-community-sync";

type SettingRow = {
  key: string;
  value_json: unknown;
};

export async function getCommunitySyncSettings(): Promise<CommunitySyncSettings> {
  try {
    const { rows } = await db.execute(sql`
      select key, value_json
      from public.community_sync_settings
    `);

    return mergeCommunitySyncSettings(
      (rows as SettingRow[]).map((row) => ({
        key: row.key,
        valueJson: row.value_json
      }))
    );
  } catch (error) {
    if (isMissingSchemaError(error)) {
      return DEFAULT_COMMUNITY_SYNC_SETTINGS;
    }
    throw error;
  }
}

export async function getCommunitySyncSettingValue<T>(
  key: string,
  fallback: T
): Promise<T> {
  try {
    const rows = await db
      .select({ valueJson: communitySyncSettings.valueJson })
      .from(communitySyncSettings)
      .where(eq(communitySyncSettings.key, key))
      .limit(1);

    const value = rows[0]?.valueJson;
    return (value === undefined ? fallback : (value as T)) ?? fallback;
  } catch (error) {
    if (isMissingSchemaError(error)) {
      return fallback;
    }
    throw error;
  }
}

export async function isAutoCreateStoryGroupEnabled() {
  const settings = await getCommunitySyncSettings();
  return settings.autoCreateStoryGroup;
}

export async function upsertCommunitySyncSettings(
  settings: CommunitySyncSettings,
  updatedBy: string
): Promise<{ ok: boolean; error: string | null; settings: CommunitySyncSettings }> {
  const normalized = clampCommunitySyncSettings(settings);
  const rows = communitySyncSettingsToRows(normalized);
  const now = new Date();

  try {
    for (const row of rows) {
      await db
        .insert(communitySyncSettings)
        .values({
          key: row.key,
          valueJson: row.valueJson,
          updatedBy,
          updatedAt: now
        })
        .onConflictDoUpdate({
          target: communitySyncSettings.key,
          set: {
            valueJson: row.valueJson,
            updatedBy,
            updatedAt: now
          }
        });
    }

    return { ok: true, error: null, settings: normalized };
  } catch (error) {
    if (isMissingSchemaError(error)) {
      return {
        ok: false,
        error: "Bảng community_sync_settings chưa được migrate.",
        settings: normalized
      };
    }

    return {
      ok: false,
      error: error instanceof Error ? error.message : "Không lưu được cấu hình.",
      settings: normalized
    };
  }
}

export async function getCommunitySyncSettingsWithMeta(): Promise<{
  settings: CommunitySyncSettings;
  updatedAt: string | null;
  updatedBy: string | null;
}> {
  try {
    const { rows } = await db.execute(sql`
      select key, value_json, updated_at, updated_by
      from public.community_sync_settings
    `);

    const typedRows = rows as Array<{
      key: string;
      value_json: unknown;
      updated_at: string;
      updated_by: string | null;
    }>;

    const latest = typedRows.reduce<{
      updatedAt: string | null;
      updatedBy: string | null;
    }>(
      (acc, row) => {
        if (!acc.updatedAt || row.updated_at > acc.updatedAt) {
          return { updatedAt: row.updated_at, updatedBy: row.updated_by };
        }
        return acc;
      },
      { updatedAt: null, updatedBy: null }
    );

    return {
      settings: mergeCommunitySyncSettings(
        typedRows.map((row) => ({ key: row.key, valueJson: row.value_json }))
      ),
      updatedAt: latest.updatedAt,
      updatedBy: latest.updatedBy
    };
  } catch (error) {
    if (isMissingSchemaError(error)) {
      return {
        settings: DEFAULT_COMMUNITY_SYNC_SETTINGS,
        updatedAt: null,
        updatedBy: null
      };
    }
    throw error;
  }
}
