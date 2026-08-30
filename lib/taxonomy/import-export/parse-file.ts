import * as XLSX from "xlsx";
import { parseCsv } from "@/lib/studio/csv";
import { slugify } from "@/lib/slugify";
import type { TaxonomyImportParsedRow } from "@/types/taxonomy-import-export";
import type { TaxonomyType } from "@/types/taxonomy";
import { isValidTaxonomyTypeValue } from "@/lib/taxonomy/import-export/constants";

function parseBool(value: unknown, fallback: boolean): boolean {
  if (value === undefined || value === null || value === "") return fallback;
  if (typeof value === "boolean") return value;
  const normalized = String(value).trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes";
}

function parseOptionalNumber(value: unknown): number | null {
  if (value === undefined || value === null || value === "") return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function parseAliases(value: unknown): string[] {
  if (!value) return [];
  const raw = String(value).trim();
  if (!raw) return [];
  return [
    ...new Set(
      raw
        .split(/[|;]/)
        .map((part) => part.trim())
        .filter(Boolean)
    )
  ];
}

function normalizeHeader(header: string): string {
  return header.trim().toLowerCase().replace(/\s+/g, "_");
}

function mapRawRow(
  raw: Record<string, unknown>,
  rowNumber: number,
  autoGenerateSlug: boolean
): TaxonomyImportParsedRow | null {
  const typeRaw = String(raw.type ?? "").trim().toLowerCase();
  if (!typeRaw || !isValidTaxonomyTypeValue(typeRaw)) return null;

  const name = String(raw.name ?? "").trim();
  if (!name) return null;

  let slug = String(raw.slug ?? "").trim();
  if (!slug && autoGenerateSlug) {
    slug = slugify(name);
  }
  if (!slug) return null;

  const type = typeRaw as TaxonomyType;

  return {
    rowNumber,
    type,
    parentType: raw.parent_type ? String(raw.parent_type).trim() : null,
    parentSlug: raw.parent_slug ? String(raw.parent_slug).trim() : null,
    name,
    slug,
    description: raw.description ? String(raw.description) : null,
    displayLabel: raw.display_label ? String(raw.display_label) : null,
    aliases: parseAliases(raw.aliases),
    icon: raw.icon ? String(raw.icon) : null,
    color: raw.color ? String(raw.color) : null,
    isActive: parseBool(raw.is_active, true),
    isPublic: parseBool(raw.is_public, true),
    isSelectableByCreator: parseBool(raw.is_selectable_by_creator, true),
    isFeatured: parseBool(raw.is_featured, false),
    useForSeo: parseBool(raw.use_for_seo, true),
    useForDiscover: parseBool(raw.use_for_discover, true),
    useForRanking: parseBool(raw.use_for_ranking, false),
    useForModeration: parseBool(
      raw.use_for_moderation,
      type === "content_warning"
    ),
    sortOrder: Number(raw.sort_order ?? 0) || 0,
    seoTitle: raw.seo_title ? String(raw.seo_title) : null,
    seoDescription: raw.seo_description ? String(raw.seo_description) : null,
    seoH1: raw.seo_h1 ? String(raw.seo_h1) : null,
    seoIntro: raw.seo_intro ? String(raw.seo_intro) : null,
    seoIndexable: parseBool(raw.seo_indexable, true),
    sitemapPriority: parseOptionalNumber(raw.sitemap_priority),
    sitemapChangefreq: raw.sitemap_changefreq
      ? String(raw.sitemap_changefreq)
      : null,
    canonicalPath: raw.canonical_path ? String(raw.canonical_path) : null,
    internalNote: raw.internal_note ? String(raw.internal_note) : null
  };
}

function recordsFromCsv(text: string): Record<string, unknown>[] {
  const { headers, rows } = parseCsv(text);
  if (headers.length === 0) {
    return [];
  }

  return rows.map((cells) => {
    const raw: Record<string, unknown> = {};
    for (let column = 0; column < headers.length; column += 1) {
      raw[headers[column]] = cells[column] ?? "";
    }
    return raw;
  });
}

function recordsFromXlsx(buffer: Buffer): Record<string, unknown>[] {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) return [];
  const sheet = workbook.Sheets[sheetName];
  const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: "",
    raw: false
  });
  return json.map((row) => {
    const normalized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(row)) {
      normalized[normalizeHeader(key)] = value;
    }
    return normalized;
  });
}

export function parseTaxonomyImportFile(input: {
  content: string;
  format: "csv" | "xlsx";
  autoGenerateSlug?: boolean;
}): { rows: TaxonomyImportParsedRow[]; parseErrors: string[] } {
  const parseErrors: string[] = [];
  const autoGenerateSlug = input.autoGenerateSlug ?? false;

  let records: Record<string, unknown>[] = [];
  try {
    if (input.format === "csv") {
      records = recordsFromCsv(input.content);
    } else {
      const buffer = Buffer.from(input.content, "base64");
      records = recordsFromXlsx(buffer);
    }
  } catch {
    return { rows: [], parseErrors: ["Không đọc được file. Kiểm tra định dạng CSV/XLSX."] };
  }

  if (records.length === 0) {
    return {
      rows: [],
      parseErrors: ["File trống hoặc thiếu dòng dữ liệu (cần header + ít nhất 1 dòng)."]
    };
  }

  const rows: TaxonomyImportParsedRow[] = [];
  records.forEach((raw, index) => {
    const rowNumber = index + 2;
    const typeRaw = String(raw.type ?? "").trim();
    if (!typeRaw) {
      parseErrors.push(`Dòng ${rowNumber}: thiếu type.`);
      return;
    }
    const mapped = mapRawRow(raw, rowNumber, autoGenerateSlug);
    if (!mapped) {
      parseErrors.push(
        `Dòng ${rowNumber}: type/slug/name không hợp lệ hoặc type bị chặn (Composer block?).`
      );
      return;
    }
    rows.push(mapped);
  });

  return { rows, parseErrors };
}

export function buildXlsxBase64FromCsv(csv: string): string {
  const workbook = XLSX.read(csv, { type: "string" });
  const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
  return Buffer.from(buffer).toString("base64");
}

export function buildCsvFromRows(
  headers: readonly string[],
  rows: Array<Record<string, string>>
): string {
  const lines = [headers.join(",")];
  for (const row of rows) {
    lines.push(headers.map((h) => row[h] ?? "").join(","));
  }
  return `\uFEFF${lines.join("\n")}`;
}
