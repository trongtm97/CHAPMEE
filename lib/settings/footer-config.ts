import { z } from "zod";
import { CHAPMEE_DMCA_BADGE } from "@/lib/compliance/chapmee-dmca-badge";
import {
  getDefaultFooterColumns,
  isLegacyFooterColumns
} from "@/lib/footer-default-columns";

const urlOptional = z
  .string()
  .trim()
  .max(2048)
  .refine(
    (value) => {
      if (!value) return true;
      try {
        const u = new URL(value);
        return u.protocol === "http:" || u.protocol === "https:";
      } catch {
        return false;
      }
    },
    { message: "URL không hợp lệ." }
  );

const hrefSchema = z
  .string()
  .trim()
  .min(1, "Liên kết không được để trống.")
  .max(2048)
  .refine(
    (value) =>
      value.startsWith("/") ||
      (() => {
        try {
          const u = new URL(value);
          return u.protocol === "http:" || u.protocol === "https:";
        } catch {
          return false;
        }
      })(),
    { message: "Liên kết phải là đường dẫn nội bộ (/) hoặc URL http(s)." }
  );

const emailOptional = z
  .string()
  .trim()
  .max(120)
  .refine(
    (value) => !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
    { message: "Email không hợp lệ." }
  );

export const footerLinkSchema = z.object({
  label: z.string().trim().min(1).max(80),
  href: hrefSchema,
  external: z.boolean().default(false),
  enabled: z.boolean().default(true),
  sortOrder: z.number().int().min(0).max(9999).default(0)
});

export const footerColumnSchema = z.object({
  title: z.string().trim().min(1).max(60),
  enabled: z.boolean().default(true),
  sortOrder: z.number().int().min(0).max(9999).default(0),
  links: z.array(footerLinkSchema).max(20).default([])
});

export const footerLegalLinkSchema = z.object({
  label: z.string().trim().min(1).max(80),
  href: hrefSchema,
  enabled: z.boolean().default(true),
  sortOrder: z.number().int().min(0).max(9999).default(0)
});

export const footerDmcaSchema = z.object({
  enabled: z.boolean().default(false),
  mode: z.enum(["image", "embed", "link"]).default("link"),
  imageUrl: urlOptional.default(""),
  embedHtml: z.string().max(8000).default(""),
  linkUrl: urlOptional.default("")
});

export const footerBoCongThuongSchema = z.object({
  enabled: z.boolean().default(false),
  status: z
    .enum(["not_started", "preparing", "notified", "registered"])
    .default("not_started"),
  type: z.string().trim().max(80).default(""),
  badgeImageUrl: urlOptional.default(""),
  verificationUrl: urlOptional.default(""),
  applicationCode: z.string().trim().max(120).default(""),
  approvedAt: z.string().trim().max(40).default("")
});

export const footerCustomBadgeSchema = z.object({
  label: z.string().trim().min(1).max(80),
  imageUrl: urlOptional,
  href: urlOptional.default(""),
  enabled: z.boolean().default(true),
  sortOrder: z.number().int().min(0).max(9999).default(0)
});

export const footerConfigSchema = z
  .object({
    enabled: z.boolean().default(true),
    brand: z.object({
      name: z.string().trim().min(1).max(80),
      description: z.string().trim().max(280).default(""),
      logoMediaId: z
        .union([z.string().uuid(), z.literal(""), z.null()])
        .transform((value) => (value && value.length > 0 ? value : null))
        .default(null)
    }),
    copyright: z.object({
      mode: z.enum(["auto_year", "custom"]).default("auto_year"),
      text: z.string().trim().max(240).default("")
    }),
    columns: z.array(footerColumnSchema).max(6).default([]),
    legalLinks: z.array(footerLegalLinkSchema).max(20).default([]),
    compliance: z.object({
      dmca: footerDmcaSchema,
      boCongThuong: footerBoCongThuongSchema,
      customBadges: z.array(footerCustomBadgeSchema).max(12).default([])
    }),
    officialContact: z.object({
      operatorName: z.string().trim().max(160).default(""),
      taxCode: z.string().trim().max(40).default(""),
      address: z.string().trim().max(400).default(""),
      supportEmail: emailOptional.default(""),
      privacyEmail: emailOptional.default(""),
      copyrightEmail: emailOptional.default(""),
      businessEmail: emailOptional.default("")
    })
  })
  .superRefine((data, ctx) => {
    if (data.compliance.dmca.enabled) {
      const dmca = data.compliance.dmca;
      if (dmca.mode === "image" && !dmca.imageUrl.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Cần URL ảnh DMCA khi chế độ image.",
          path: ["compliance", "dmca", "imageUrl"]
        });
      }
      if (dmca.mode === "link" && !dmca.linkUrl.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Cần URL liên kết DMCA khi chế độ link.",
          path: ["compliance", "dmca", "linkUrl"]
        });
      }
      if (dmca.mode === "embed" && !dmca.embedHtml.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Embed HTML chưa được hỗ trợ an toàn trên frontend.",
          path: ["compliance", "dmca", "embedHtml"]
        });
      }
    }

    if (data.compliance.boCongThuong.enabled) {
      const bo = data.compliance.boCongThuong;
      if (!bo.badgeImageUrl.trim() && !bo.verificationUrl.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            "Cần ảnh badge hoặc URL xác minh khi bật thông báo Bộ Công Thương.",
          path: ["compliance", "boCongThuong", "badgeImageUrl"]
        });
      }
    }

    for (const badge of data.compliance.customBadges) {
      if (badge.enabled && !badge.imageUrl.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Badge tùy chỉnh cần URL ảnh khi bật.",
          path: ["compliance", "customBadges"]
        });
        break;
      }
    }
  });

export type FooterConfig = z.infer<typeof footerConfigSchema>;
export type FooterColumn = z.infer<typeof footerColumnSchema>;
export type FooterLink = z.infer<typeof footerLinkSchema>;
export type FooterLegalLink = z.infer<typeof footerLegalLinkSchema>;
export type FooterCustomBadge = z.infer<typeof footerCustomBadgeSchema>;

export const FOOTER_CONFIG_KEY = "footer_config";
export const FOOTER_CONFIG_CACHE_TAG = "footer-config";

export const defaultFooterConfig: FooterConfig = {
  enabled: true,
  brand: {
    name: "ChapMee",
    description:
      "Nơi bạn lướt, đọc và khám phá những câu chuyện giải trí theo cách mới",
    logoMediaId: null
  },
  copyright: {
    mode: "auto_year",
    text: "© {year} ChapMee. All rights reserved."
  },
  columns: getDefaultFooterColumns(),
  legalLinks: [],
  compliance: {
    dmca: {
      enabled: true,
      mode: "image",
      imageUrl: CHAPMEE_DMCA_BADGE.imageUrl,
      embedHtml: "",
      linkUrl: CHAPMEE_DMCA_BADGE.statusUrl
    },
    boCongThuong: {
      enabled: false,
      status: "not_started",
      type: "",
      badgeImageUrl: "",
      verificationUrl: "",
      applicationCode: "",
      approvedAt: ""
    },
    customBadges: []
  },
  officialContact: {
    operatorName: "",
    taxCode: "",
    address: "",
    supportEmail: "support@chapmee.com",
    privacyEmail: "privacy@chapmee.com",
    copyrightEmail: "copyright@chapmee.com",
    businessEmail: "business@chapmee.com"
  }
};

function ensureFooterColumns(config: FooterConfig): FooterConfig {
  if (isLegacyFooterColumns(config.columns)) {
    return { ...config, columns: getDefaultFooterColumns() };
  }
  return config;
}

function ensureOfficialContact(
  contact: FooterConfig["officialContact"]
): FooterConfig["officialContact"] {
  const defaults = defaultFooterConfig.officialContact;
  return {
    operatorName: contact.operatorName ?? defaults.operatorName,
    taxCode: contact.taxCode ?? defaults.taxCode,
    address: contact.address ?? defaults.address,
    supportEmail: contact.supportEmail ?? defaults.supportEmail,
    privacyEmail: contact.privacyEmail ?? defaults.privacyEmail,
    copyrightEmail: contact.copyrightEmail ?? defaults.copyrightEmail,
    businessEmail: contact.businessEmail ?? defaults.businessEmail
  };
}

export function parseFooterConfig(raw: unknown): FooterConfig {
  const merged =
    raw && typeof raw === "object"
      ? deepMergeDefaults(defaultFooterConfig, raw as Record<string, unknown>)
      : defaultFooterConfig;
  const parsed = footerConfigSchema.parse(merged);
  return ensureFooterColumns({
    ...parsed,
    officialContact: ensureOfficialContact(parsed.officialContact)
  });
}

export function safeParseFooterConfig(raw: unknown) {
  return footerConfigSchema.safeParse(
    raw && typeof raw === "object"
      ? deepMergeDefaults(defaultFooterConfig, raw as Record<string, unknown>)
      : defaultFooterConfig
  );
}

export function formatFooterCopyright(config: FooterConfig, year = new Date().getFullYear()) {
  const template =
    config.copyright.text.trim() ||
    (config.copyright.mode === "auto_year"
      ? defaultFooterConfig.copyright.text
      : "");

  if (!template) {
    return config.copyright.mode === "auto_year"
      ? `© ${year} ${config.brand.name}. All rights reserved.`
      : "";
  }

  if (config.copyright.mode === "auto_year") {
    return template.replace(/\{year\}/gi, String(year));
  }

  return template;
}

export function sortByOrder<T extends { sortOrder: number }>(items: T[]) {
  return [...items].sort((a, b) => a.sortOrder - b.sortOrder);
}

function deepMergeDefaults<T extends Record<string, unknown>>(
  defaults: T,
  patch: Record<string, unknown>
): T {
  const result = { ...defaults } as Record<string, unknown>;
  for (const key of Object.keys(patch)) {
    const patchVal = patch[key];
    const defaultVal = defaults[key];
    if (
      patchVal &&
      typeof patchVal === "object" &&
      !Array.isArray(patchVal) &&
      defaultVal &&
      typeof defaultVal === "object" &&
      !Array.isArray(defaultVal)
    ) {
      result[key] = deepMergeDefaults(
        defaultVal as Record<string, unknown>,
        patchVal as Record<string, unknown>
      );
    } else if (patchVal !== undefined) {
      result[key] = patchVal;
    }
  }
  return result as T;
}
