export type ContactSettingsDb = {
  support_email: string;
  enable_support_email: boolean;
  facebook_url: string;
  enable_facebook: boolean;
  telegram_url: string;
  enable_telegram: boolean;
  enable_feedback_form: boolean;
  contact_title: string;
  contact_description: string;
};

export type ContactSettings = {
  supportEmail: string;
  enableSupportEmail: boolean;
  facebookUrl: string;
  enableFacebook: boolean;
  telegramUrl: string;
  enableTelegram: boolean;
  enableFeedbackForm: boolean;
  contactTitle: string;
  contactDescription: string;
};

export type ContactSettingsValidationErrors = Partial<
  Record<
    | "supportEmail"
    | "facebookUrl"
    | "telegramUrl"
    | "contactTitle"
    | "contactDescription"
    | "form",
    string
  >
>;

export type FeedbackCategory = "feedback" | "bug" | "feature";

export type FeedbackMessageRow = {
  id: string;
  user_id: string | null;
  category: FeedbackCategory;
  message: string;
  contact_email: string | null;
  created_at: string;
};
