import type { TaxonomyType } from "@/types/taxonomy";
import { TAXONOMY_TYPES } from "@/types/taxonomy";
import type { UpsertTaxonomyTermInput } from "@/lib/taxonomy/admin-data";
import { parseCsvLine } from "@/lib/taxonomy/parse-csv-line";

export type TaxonomyImportRow = UpsertTaxonomyTermInput & {
  parent_slug?: string | null;
};

function parseBool(value: unknown, fallback: boolean) {
  if (value === undefined || value === null || value === "") return fallback;
  if (typeof value === "boolean") return value;
  const normalized = String(value).trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes";
}

function mapJsonRow(raw: Record<string, unknown>): TaxonomyImportRow | null {
  const type = String(raw.type ?? "").trim() as TaxonomyType;
  if (!TAXONOMY_TYPES.includes(type)) return null;

  const slug = String(raw.slug ?? "").trim();
  const name = String(raw.name ?? "").trim();
  if (!slug || !name) return null;

  const parentId = raw.parent_id ? String(raw.parent_id).trim() : null;
  const parentSlug = raw.parent_slug ? String(raw.parent_slug).trim() : null;
  const aliasesRaw = raw.aliases ? String(raw.aliases) : "";

  return {
    type,
    slug,
    name,
    parent_id: parentId || null,
    parent_slug: parentSlug || null,
    description: raw.description ? String(raw.description) : null,
    display_label: raw.display_label ? String(raw.display_label) : null,
    internal_note: raw.internal_note ? String(raw.internal_note) : null,
    icon: raw.icon ? String(raw.icon) : null,
    color: raw.color ? String(raw.color) : null,
    aliases: aliasesRaw
      ? aliasesRaw.split(/[;|]/).map((part) => part.trim()).filter(Boolean)
      : undefined,
    is_active: parseBool(raw.is_active, true),
    is_public: parseBool(raw.is_public, true),
    is_selectable_by_creator: parseBool(raw.is_selectable_by_creator, true),
    is_featured: parseBool(raw.is_featured, false),
    use_for_seo: parseBool(raw.use_for_seo, true),
    use_for_discover: parseBool(raw.use_for_discover, true),
    use_for_ranking: parseBool(raw.use_for_ranking, false),
    use_for_moderation: parseBool(raw.use_for_moderation, type === "content_warning"),
    sort_order: Number(raw.sort_order ?? 0) || 0
  };
}

export function parseTaxonomyImportJson(text: string): {
  rows: TaxonomyImportRow[];
  errors: string[];
} {
  const errors: string[] = [];
  let parsed: unknown;

  try {
    parsed = JSON.parse(text);
  } catch {
    return { rows: [], errors: ["JSON không hợp lệ."] };
  }

  const list = Array.isArray(parsed) ? parsed : [parsed];
  const rows: TaxonomyImportRow[] = [];

  list.forEach((item, index) => {
    if (!item || typeof item !== "object") {
      errors.push(`Dòng ${index + 1}: không phải object.`);
      return;
    }
    const row = mapJsonRow(item as Record<string, unknown>);
    if (!row) {
      errors.push(`Dòng ${index + 1}: thiếu type/slug/name hoặc type không hợp lệ.`);
      return;
    }
    rows.push(row);
  });

  return { rows, errors };
}

/** CSV: type,slug,name,sort_order,is_selectable_by_creator,is_active */
export function parseTaxonomyImportCsv(text: string): {
  rows: TaxonomyImportRow[];
  errors: string[];
} {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) {
    return { rows: [], errors: ["CSV cần header và ít nhất một dòng dữ liệu."] };
  }

  const header = parseCsvLine(lines[0]).map((cell) => cell.trim().toLowerCase());
  const typeIdx = header.indexOf("type");
  const slugIdx = header.indexOf("slug");
  const nameIdx = header.indexOf("name");

  if (typeIdx < 0 || slugIdx < 0 || nameIdx < 0) {
    return {
      rows: [],
      errors: ["CSV cần cột type, slug, name."]
    };
  }

  const errors: string[] = [];
  const rows: TaxonomyImportRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cells = parseCsvLine(lines[i]);
    const raw: Record<string, unknown> = {
      type: cells[typeIdx],
      slug: cells[slugIdx],
      name: cells[nameIdx]
    };

    for (const key of header) {
      const idx = header.indexOf(key);
      if (idx >= 0 && cells[idx] !== undefined) {
        raw[key] = cells[idx];
      }
    }

    const row = mapJsonRow(raw);
    if (!row) {
      errors.push(`CSV dòng ${i + 1}: dữ liệu không hợp lệ.`);
      continue;
    }
    rows.push(row);
  }

  return { rows, errors };
}

export function parseTaxonomyImportPayload(text: string, format: "json" | "csv") {
  return format === "csv"
    ? parseTaxonomyImportCsv(text)
    : parseTaxonomyImportJson(text);
}
