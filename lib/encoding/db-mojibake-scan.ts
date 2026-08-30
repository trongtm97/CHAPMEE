import type { Pool } from "pg";
import {
  DB_MOJIBAKE_TEXT_FIELDS,
  getFieldsForTable,
  type DbTextFieldSpec
} from "@/lib/encoding/db-text-fields";
import {
  excerpt,
  previewMojibakeRepair,
  type MojibakeRepairPreview
} from "@/lib/encoding/mojibake-repair";

export type MojibakeDbHit = {
  table: string;
  field: string;
  id: string;
  currentExcerpt: string;
  repairedExcerpt: string;
  confidence: string;
  score: number;
  reasons: string[];
  repairable: boolean;
};

const MOJIBAKE_WHERE = (col: string) => `(
  ${col} LIKE '%Ã%' OR ${col} LIKE '%Â%' OR ${col} LIKE '%Ä%'
  OR ${col} LIKE '%á»%' OR ${col} LIKE '%áº%' OR ${col} LIKE '%â€%'
  OR ${col} LIKE '%Æ%' OR ${col} LIKE '%ï¿½%'
  OR POSITION(CHR(65533) IN ${col}) > 0
)`;

function quoteIdent(name: string) {
  return `"${name.replace(/"/g, '""')}"`;
}

async function tableExists(pool: Pool, table: string): Promise<boolean> {
  const r = await pool.query(
    `SELECT 1 FROM information_schema.tables
     WHERE table_schema = 'public' AND table_name = $1 LIMIT 1`,
    [table]
  );
  return (r.rowCount ?? 0) > 0;
}

async function columnExists(pool: Pool, table: string, column: string): Promise<boolean> {
  const r = await pool.query(
    `SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = $1 AND column_name = $2 LIMIT 1`,
    [table, column]
  );
  return (r.rowCount ?? 0) > 0;
}

function normalizeTextValue(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.map(String).join(", ");
  return String(value);
}

export async function scanMojibakeInDb(input: {
  pool: Pool;
  tableFilter?: string;
  fieldFilter?: string;
  limitPerField?: number;
}): Promise<{
  scannedFields: number;
  hits: MojibakeDbHit[];
  skipped: string[];
}> {
  const limitPerField = input.limitPerField ?? 500;
  let specs = getFieldsForTable(input.tableFilter);
  if (input.fieldFilter) {
    specs = specs.filter((s) => s.field === input.fieldFilter);
  }

  const hits: MojibakeDbHit[] = [];
  const skipped: string[] = [];
  let scannedFields = 0;

  for (const spec of specs) {
    if (!(await tableExists(input.pool, spec.table))) {
      skipped.push(`${spec.table} (missing table)`);
      continue;
    }
    if (!(await columnExists(input.pool, spec.table, spec.field))) {
      skipped.push(`${spec.table}.${spec.field} (missing column)`);
      continue;
    }

    scannedFields += 1;
    const t = quoteIdent(spec.table);
    const f = quoteIdent(spec.field);
    const idCol = quoteIdent(spec.idColumn ?? "id");
    const isLargeContent = spec.field === "content";

    const selectExpr = isLargeContent ? `LEFT(${f}::text, 8000)` : f;

    const sql = `
      SELECT ${idCol} AS id, ${selectExpr} AS val
      FROM ${t}
      WHERE ${f} IS NOT NULL AND ${MOJIBAKE_WHERE(f)}
      LIMIT $1
    `;

    const result = await input.pool.query<{ id: string; val: string }>(sql, [limitPerField]);

    for (const row of result.rows) {
      const text = normalizeTextValue(row.val);
      if (!text) continue;
      const preview = previewMojibakeRepair(text);
      if (preview.confidence === "none" && !preview.reasons.includes("original_suspicious")) {
        continue;
      }
      hits.push({
        table: spec.table,
        field: spec.field,
        id: String(row.id),
        currentExcerpt: excerpt(preview.original),
        repairedExcerpt: excerpt(preview.repaired),
        confidence: preview.confidence,
        score: preview.score,
        reasons: preview.reasons,
        repairable: spec.repairable !== false
      });
    }
  }

  return { scannedFields, hits, skipped };
}

export async function fetchRowFieldValue(
  pool: Pool,
  spec: DbTextFieldSpec,
  id: string
): Promise<string | null> {
  const t = quoteIdent(spec.table);
  const f = quoteIdent(spec.field);
  const idCol = quoteIdent(spec.idColumn ?? "id");
  const sql = `SELECT ${f} AS val FROM ${t} WHERE ${idCol} = $1 LIMIT 1`;
  const r = await pool.query<{ val: unknown }>(sql, [id]);
  return normalizeTextValue(r.rows[0]?.val);
}

export { DB_MOJIBAKE_TEXT_FIELDS };
