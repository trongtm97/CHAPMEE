import { revalidatePath } from "next/cache";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { refreshMonetizationConfig } from "@/lib/monetization/config";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { getSupabaseClientOptions } from "@/lib/supabase/client-options";
import type {
  MonetizationConfigKey,
  MonetizationSettingRow,
  MonetizationSettingValue
} from "@/types/monetization";

export async function fetchMonetizationSettings(): Promise<
  MonetizationSettingRow[]
> {
  try {
    const { anonKey, url } = getSupabaseEnv();
    const supabase = createSupabaseClient(url, anonKey, getSupabaseClientOptions());
    const { data, error } = await supabase
      .from("monetization_settings")
      .select(
        "id, key, value, description, is_public, updated_by, created_at, updated_at"
      );

    if (error) {
      const errorCode = (error as { code?: string }).code ?? "";
      if (errorCode === "PGRST204" || errorCode === "PGRST205") {
        return [];
      }
      console.error("Failed to fetch monetization settings", error.message);
      return [];
    }

    return (data ?? []) as MonetizationSettingRow[];
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("PGRST204") || message.includes("PGRST205")) {
      return [];
    }
    console.error(
      "Failed to fetch monetization settings",
      message
    );
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
  const supabase = await createClient();
  const now = new Date().toISOString();

  const { error } = await supabase.from("monetization_settings").upsert(
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
