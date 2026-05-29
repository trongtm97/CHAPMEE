import { DEFAULT_CONTACT_SETTINGS } from "@/lib/settings/default-contact-settings";
import type { ContactSettingsActionState } from "@/lib/admin/contact-settings-actions.types";

export const INITIAL_CONTACT_SETTINGS_ACTION_STATE: ContactSettingsActionState =
  {
    ok: false,
    message: null,
    settings: DEFAULT_CONTACT_SETTINGS,
    updatedAt: null,
    fieldErrors: {}
  };
