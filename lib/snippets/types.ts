export const SNIPPET_TYPES = [
  "custom_css",
  "head_script",
  "body_start_script",
  "footer_script",
  "safe_html"
] as const;

export type SnippetType = (typeof SNIPPET_TYPES)[number];

export const SNIPPET_STATUSES = ["draft", "active", "inactive", "error"] as const;

export type SnippetStatus = (typeof SNIPPET_STATUSES)[number];

export const SNIPPET_DEVICE_TARGETS = ["all", "mobile", "desktop"] as const;

export type SnippetDeviceTarget = (typeof SNIPPET_DEVICE_TARGETS)[number];

export const SNIPPET_USER_TARGETS = [
  "all",
  "logged_out",
  "logged_in",
  "reader",
  "creator",
  "admin"
] as const;

export type SnippetUserTarget = (typeof SNIPPET_USER_TARGETS)[number];

export const PLACEMENT_MODES = ["global", "route", "surface", "page_group"] as const;

export type PlacementMode = (typeof PLACEMENT_MODES)[number];

export type SnippetPlacementConfig = {
  mode: PlacementMode;
  pageGroup?: string | null;
  allowOnLegalRoutes?: boolean;
  allowScriptsOnLegal?: boolean;
};

export type RuntimeSnippetPayload = {
  id: string;
  name: string;
  type: SnippetType;
  code: string;
  priority: number;
  placementConfig: SnippetPlacementConfig;
  routePatterns: string[];
  surfaceKeys: string[];
  deviceTarget: SnippetDeviceTarget;
  userTarget: SnippetUserTarget;
  startsAt: string | null;
  endsAt: string | null;
};

export type SnippetUserRuntimeContext = {
  isLoggedIn: boolean;
  isReader: boolean;
  isCreator: boolean;
  isAdmin: boolean;
};

export type SnippetFormInput = {
  name: string;
  description?: string | null;
  type: SnippetType;
  status: SnippetStatus;
  code: string;
  priority: number;
  placementConfig: SnippetPlacementConfig;
  routePatterns: string[];
  surfaceKeys: string[];
  deviceTarget: SnippetDeviceTarget;
  userTarget: SnippetUserTarget;
  startsAt?: string | null;
  endsAt?: string | null;
  notes?: string | null;
  changeNote?: string | null;
  confirmHighRisk?: boolean;
};

export type SnippetValidationResult = {
  status: "ok" | "warn" | "block";
  message: string;
  warnings: string[];
  blocked: boolean;
  requiresSuperConfirm: boolean;
};
