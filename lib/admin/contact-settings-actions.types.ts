import type { ContactSettings } from "@/types/contact-settings";

export type ContactSettingsActionState = {
  ok: boolean;
  message: string | null;
  settings: ContactSettings;
  updatedAt: string | null;
  fieldErrors: Record<string, string>;
};
