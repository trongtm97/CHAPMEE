import {
  getDefaultComposerAdminSettings,
  mergeBlockTypeSettings,
  mergeModeSettings,
  mergeValidationSettings,
  type ComposerAdminSettingsBundle
} from "@/lib/composer/composer-settings-defaults";
import { createClient } from "@/lib/supabase/server";
import { isMissingSchemaError } from "@/lib/supabase/schema-errors";

export type {
  ComposerAdminSettingsBundle,
  ComposerBlockTypeRegistryEntry,
  ComposerModeRegistryEntry,
  ComposerValidationSettings
} from "@/lib/composer/composer-settings-defaults";

export {
  DEFAULT_COMPOSER_VALIDATION_SETTINGS,
  getDefaultComposerAdminSettings,
  isBlockTypeActive,
  isModeActiveForCreators,
  mergeValidationSettings
} from "@/lib/composer/composer-settings-defaults";

export async function getComposerAdminSettings(): Promise<ComposerAdminSettingsBundle> {
  const defaults = getDefaultComposerAdminSettings();

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.from("composer_settings").select("key, value");

    if (error) {
      if (isMissingSchemaError(error)) {
        return defaults;
      }
      return defaults;
    }

    const rows = data ?? [];
    const byKey = new Map(rows.map((row) => [String(row.key), row.value]));

    return {
      validation: mergeValidationSettings(byKey.get("validation")),
      modes: mergeModeSettings(byKey.get("modes")),
      blockTypes: mergeBlockTypeSettings(byKey.get("block_types")),
      templates: []
    };
  } catch {
    return defaults;
  }
}
