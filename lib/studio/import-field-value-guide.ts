import type { ContentOrigin, TranslationType } from "@/lib/content-origin/content-origin-types";
import {
  CONTENT_ORIGIN_VALUES,
  TRANSLATION_TYPE_VALUES
} from "@/lib/content-origin/content-origin-types";
import { STORY_SOURCE_LANGUAGE_OPTIONS } from "@/lib/creator/story-source-languages";
import { removeVietnameseTones } from "@/lib/utilities/vietnamese-tone-remover";
import { exportRowsToCsv } from "@/lib/studio/csv";

function normalizeLookup(value: string): string {
  return removeVietnameseTones(value).trim().toLowerCase().replace(/\s+/g, " ");
}

export const IMPORT_CONTENT_ORIGIN_GUIDE: Array<{
  value: ContentOrigin;
  vietnamese: string;
  meaning: string;
  aliases: string[];
}> = [
  {
    value: "original",
    vietnamese: "Sáng tác",
    meaning: "Truyện do bạn tự sáng tác",
    aliases: ["original", "sáng tác", "sang tac", "nguyên bản", "nguyen ban", "tự sáng tác"]
  },
  {
    value: "translation",
    vietnamese: "Dịch",
    meaning: "Truyện dịch từ tác phẩm nước ngoài",
    aliases: ["translation", "dịch", "dich", "truyện dịch", "truyen dich", "bản dịch"]
  }
];

export const IMPORT_TRANSLATION_TYPE_GUIDE: Array<{
  value: TranslationType;
  vietnamese: string;
  meaning: string;
}> = [
  {
    value: "fan_translation",
    vietnamese: "Dịch cộng đồng",
    meaning: "Dịch tự do / fan (mặc định)"
  },
  {
    value: "official_license",
    vietnamese: "Bản quyền chính thức",
    meaning: "Có giấy phép / hợp đồng chính thức"
  },
  {
    value: "creator_authorized",
    vietnamese: "Tác giả cho phép",
    meaning: "Được tác giả hoặc đại diện cho phép"
  },
  {
    value: "public_domain",
    vietnamese: "Phạm vi công cộng",
    meaning: "Tác phẩm hết hạn bản quyền / public domain"
  },
  {
    value: "creative_commons",
    vietnamese: "Creative Commons",
    meaning: "Giấy phép CC cho phép dịch"
  },
  {
    value: "unknown",
    vietnamese: "Chưa rõ",
    meaning: "Chưa xác định loại dịch"
  }
];

export function formatImportLanguageGuide(): string {
  return STORY_SOURCE_LANGUAGE_OPTIONS.map(
    (option) => `${option.label} → ghi: ${option.value}`
  ).join("; ");
}

export function resolveImportContentOrigin(raw: string): {
  value: ContentOrigin;
  warning: string | null;
} {
  const normalized = normalizeLookup(raw);
  if (!normalized) {
    return { value: "original", warning: null };
  }

  for (const entry of IMPORT_CONTENT_ORIGIN_GUIDE) {
    if (
      entry.aliases.some((alias) => normalizeLookup(alias) === normalized) ||
      normalizeLookup(entry.value) === normalized
    ) {
      return { value: entry.value, warning: null };
    }
  }

  return {
    value: "original",
    warning: `content_origin "${raw.trim()}" không hợp lệ — bỏ qua, mặc định Sáng tác (original).`
  };
}

export function resolveImportOriginalLanguage(raw: string): {
  value: string | null;
  warning: string | null;
} {
  const trimmed = raw.trim();
  if (!trimmed) {
    return { value: null, warning: null };
  }

  const normalized = normalizeLookup(trimmed);
  const byValue = STORY_SOURCE_LANGUAGE_OPTIONS.find((option) => option.value === trimmed);
  if (byValue) {
    return { value: byValue.value, warning: null };
  }

  const byLabel = STORY_SOURCE_LANGUAGE_OPTIONS.find(
    (option) => normalizeLookup(option.label) === normalized
  );
  if (byLabel) {
    return {
      value: byLabel.value === "other" ? trimmed : byLabel.value,
      warning: null
    };
  }

  if (trimmed.length >= 2) {
    return { value: trimmed, warning: null };
  }

  return {
    value: null,
    warning: `original_language "${trimmed}" không hợp lệ — bỏ qua, bổ sung sau trong Studio.`
  };
}

export function resolveImportTranslationType(raw: string): {
  value: TranslationType;
  warning: string | null;
} {
  const trimmed = raw.trim();
  if (!trimmed) {
    return { value: "fan_translation", warning: null };
  }

  const normalized = normalizeLookup(trimmed);
  if (
    TRANSLATION_TYPE_VALUES.includes(trimmed as TranslationType)
  ) {
    return { value: trimmed as TranslationType, warning: null };
  }

  const byGuide = IMPORT_TRANSLATION_TYPE_GUIDE.find(
    (entry) =>
      normalizeLookup(entry.value) === normalized ||
      normalizeLookup(entry.vietnamese) === normalized
  );
  if (byGuide) {
    return { value: byGuide.value, warning: null };
  }

  return {
    value: "fan_translation",
    warning: `translation_type "${trimmed}" không hợp lệ — bỏ qua, mặc định dịch cộng đồng (fan_translation).`
  };
}

export function buildImportFieldValuesReferenceCsv(): string {
  const rows: Array<Record<string, string>> = [];

  for (const entry of IMPORT_CONTENT_ORIGIN_GUIDE) {
    rows.push({
      field: "content_origin",
      value_to_write: entry.value,
      vietnamese_label: entry.vietnamese,
      meaning: entry.meaning,
      also_accepted: entry.aliases.join(", ")
    });
  }

  for (const option of STORY_SOURCE_LANGUAGE_OPTIONS) {
    rows.push({
      field: "original_language",
      value_to_write: option.value,
      vietnamese_label: option.label,
      meaning: "Ngôn ngữ tác phẩm gốc (tuỳ chọn khi nhập — bổ sung sau trong Studio)",
      also_accepted: option.label
    });
  }

  for (const entry of IMPORT_TRANSLATION_TYPE_GUIDE) {
    rows.push({
      field: "translation_type",
      value_to_write: entry.value,
      vietnamese_label: entry.vietnamese,
      meaning: entry.meaning,
      also_accepted: entry.vietnamese
    });
  }

  rows.push({
    field: "story_structure_type",
    value_to_write: "chaptered",
    vietnamese_label: "Nhiều chương",
    meaning: "Truyện có nhiều chương",
    also_accepted: "chaptered"
  });
  rows.push({
    field: "story_structure_type",
    value_to_write: "standalone",
    vietnamese_label: "Một phần",
    meaning: "Truyện ngắn / một phần duy nhất",
    also_accepted: "standalone"
  });
  rows.push({
    field: "status",
    value_to_write: "draft",
    vietnamese_label: "Nháp",
    meaning: "Import luôn tạo/cập nhật ở dạng nháp nếu chưa đủ điều kiện xuất bản",
    also_accepted: "draft, nháp"
  });
  rows.push({
    field: "has_content_warning",
    value_to_write: "true / false",
    vietnamese_label: "Có / Không cảnh báo",
    meaning: "Có nội dung nhạy cảm cần cảnh báo",
    also_accepted: "có, co, yes, 1, không, khong, no, 0"
  });

  return exportRowsToCsv(
    ["field", "value_to_write", "vietnamese_label", "meaning", "also_accepted"],
    rows
  );
}

export function buildImportFieldValuesInstructionBlock(): string {
  const lines = [
    "══ Giá trị cột chọn (ghi vào Excel) ══",
    "",
    "content_origin — Nguồn truyện:",
    ...IMPORT_CONTENT_ORIGIN_GUIDE.map(
      (entry) =>
        `  • ${entry.vietnamese}: ghi "${entry.value}" hoặc "${entry.aliases[0]}" — ${entry.meaning}`
    ),
    "",
    "original_language — Ngôn ngữ gốc (TUỲ CHỌN khi nhập, có thể bổ sung sau trong Studio):",
    ...STORY_SOURCE_LANGUAGE_OPTIONS.map(
      (option) => `  • ${option.label}: ghi "${option.value}"`
    ),
    "  • Hoặc ghi tên ngôn ngữ tự do (vd: Tiếng Đức) nếu không có trong danh sách.",
    "",
    "translation_type — Loại dịch (chỉ khi content_origin = dịch):",
    ...IMPORT_TRANSLATION_TYPE_GUIDE.map(
      (entry) =>
        `  • ${entry.vietnamese}: ghi "${entry.value}" — ${entry.meaning}`
    ),
    "",
    "Lưu ý import nháp:",
    "  • Trường sai/không khớp → bỏ qua trường đó, vẫn tạo truyện nháp.",
    "  • Chỉ bỏ qua cả dòng khi thiếu tiêu đề (tạo mới) hoặc story_code không tồn tại (cập nhật).",
    "  • cover_url: dán link ảnh https công khai — hệ thống tự tải về media ChapMee (không lưu link ngoài).",
    "  • Truyện dịch: source_url, original_language không bắt buộc trong file — hoàn thiện sau trong Studio."
  ];

  return lines.join("\n");
}

export { CONTENT_ORIGIN_VALUES, TRANSLATION_TYPE_VALUES };
