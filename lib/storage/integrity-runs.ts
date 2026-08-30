import { getPgPool } from "@/lib/db/pool";

export type IntegrityCheckKind = "health" | "chapters" | "imports" | "s3_orphans";

export type IntegrityRunRow = {
  check_kind: IntegrityCheckKind;
  ok: boolean;
  summary: Record<string, unknown>;
  created_at: string;
};

export function shouldPersistIntegrityRun(argv: string[] = process.argv) {
  return !argv.includes("--no-persist");
}

export async function persistIntegrityRun(input: {
  checkKind: IntegrityCheckKind;
  ok: boolean;
  summary: Record<string, unknown>;
}) {
  if (!shouldPersistIntegrityRun()) {
    return;
  }

  try {
    const pool = getPgPool();
    await pool.query(
      `insert into public.storage_integrity_runs (check_kind, ok, summary)
       values ($1, $2, $3::jsonb)`,
      [input.checkKind, input.ok, JSON.stringify(input.summary)]
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (process.env.STORAGE_INTEGRITY_STRICT === "1") {
      throw error;
    }
    console.warn(`[integrity] persist skipped (${message}) — run npm run db:migrate for 0011`);
  }
}

export async function getRecentIntegrityRuns(): Promise<IntegrityRunRow[]> {
  try {
    const pool = getPgPool();
    const { rows } = await pool.query<{
      check_kind: IntegrityCheckKind;
      ok: boolean;
      summary: Record<string, unknown>;
      created_at: Date;
    }>(
      `select distinct on (check_kind)
         check_kind, ok, summary, created_at
       from public.storage_integrity_runs
       order by check_kind, created_at desc`
    );

    return rows.map((row) => ({
      check_kind: row.check_kind,
      ok: row.ok,
      summary: row.summary ?? {},
      created_at:
        row.created_at instanceof Date
          ? row.created_at.toISOString()
          : String(row.created_at)
    }));
  } catch {
    return [];
  }
}
