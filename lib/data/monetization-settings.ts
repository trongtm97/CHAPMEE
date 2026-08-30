import { sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { refreshMonetizationConfig } from "@/lib/monetization/config";
import { createClient } from "@/lib/data/server";
import { createPublicClient } from "@/lib/data/public-client";
import type {
  MonetizationConfigKey,
  MonetizationSettingRow,
  MonetizationSettingValue
} from "@/types/monetization";

async function fetchMonetizationSettingsFromDb(options?: {
  includePrivate?: boolean;
}): Promise<
  MonetizationSettingRow[]
> {
  const result = options?.includePrivate
    ? await db.execute(sql`
    select id, key, value, description, is_public, updated_by, created_at, updated_at
    from public.monetization_settings
    order by key asc
  `)
    : await db.execute(sql`
    select id, key, value, description, is_public, updated_by, created_at, updated_at
    from public.monetization_settings
    where is_public = true
    order by key asc
  `);
  return result.rows as MonetizationSettingRow[];
}

export async function fetchMonetizationSettings(): Promise<
  MonetizationSettingRow[]
>;
export async function fetchMonetizationSettings(options: {
  includePrivate: true;
}): Promise<MonetizationSettingRow[]>;
export async function fetchMonetizationSettings(options: {
  includePrivate?: boolean;
}): Promise<MonetizationSettingRow[]>;
export async function fetchMonetizationSettings(options?: {
  includePrivate?: boolean;
}): Promise<MonetizationSettingRow[]> {
  try {
    return await fetchMonetizationSettingsFromDb(options);
  } catch {
    // Fall through to PostgREST. Public pages should keep rendering with defaults.
  }

  if (options?.includePrivate) {
    return [];
  }

  try {
    const db = createPublicClient();
    const { data, error } = await db
      .from("monetization_settings")
      .select(
        "id, key, value, description, is_public, updated_by, created_at, updated_at"
      )
      .eq("is_public", true);

    if (error) {
      const errorCode = (error as { code?: string }).code ?? "";
      if (errorCode === "PGRST204" || errorCode === "PGRST205") {
        return [];
      }
      return [];
    }

    return (data ?? []) as MonetizationSettingRow[];
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("PGRST204") || message.includes("PGRST205")) {
      return [];
    }
    return [];
  }
}

export type UpsertMonetizationSettingInput = {
  key: MonetizationConfigKey;
  value: MonetizationSettingValue;
  description: string;
  isPublic: boolean;
};

export async function upsertMonetizationSettings(
  settings: UpsertMonetizationSettingInput[],
  updatedBy: string | null
) {
  const db = await createClient();
  const now = new Date().toISOString();

  const { error } = await db.from("monetization_settings").upsert(
    settings.map((setting) => ({
      key: setting.key,
      value: setting.value,
      description: setting.description,
      is_public: setting.isPublic,
      updated_by: updatedBy,
      updated_at: now
    })),
    { onConflict: "key" }
  );

  if (error) {
    return { error: error.message, success: false };
  }

  refreshMonetizationConfig();
  revalidatePath("/admin/monetization");
  revalidatePath("/admin/monetization-settings");

  return { error: null, success: true };
}
