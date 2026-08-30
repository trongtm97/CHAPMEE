import { defaultFooterConfig, type FooterConfig } from "@/lib/settings/footer-config";

export type FooterSettingsActionState = {
  ok: boolean;
  message: string | null;
  config: FooterConfig;
  updatedAt: string | null;
  fieldErrors: Record<string, string>;
};

export const INITIAL_FOOTER_SETTINGS_ACTION_STATE: FooterSettingsActionState = {
  ok: false,
  message: null,
  config: defaultFooterConfig,
  updatedAt: null,
  fieldErrors: {}
};
