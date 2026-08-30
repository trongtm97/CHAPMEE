import { createPublicClient } from "@/lib/data/public-client";
import type { ContactSettingsDb } from "@/types/contact-settings";

export type AppSettingRow = {
  id: string;
  key: string;
  value: ContactSettingsDb | Record<string, unknown>;
  is_public: boolean;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
};

export async function fetchAppSettingByKey(key: string): Promise<AppSettingRow | null> {
  try {
    const db = createPublicClient();
    const { data, error } = await db
      .from("app_settings")
      .select("id, key, value, is_public, updated_by, created_at, updated_at")
      .eq("key", key)
      .maybeSingle();

    if (error) {
      const errorCode = (error as { code?: string }).code ?? "";
      if (errorCode === "PGRST204" || errorCode === "PGRST205") {
        return null;
      }
      return null;
    }

    return (data as AppSettingRow | null) ?? null;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("PGRST204") || message.includes("PGRST205")) {
      return null;
    }
    return null;
  }
}
