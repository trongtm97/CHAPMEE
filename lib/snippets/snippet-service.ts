import "server-only";

import { and, asc, count, desc, eq, ilike, inArray, isNull, or, sql, type SQL } from "drizzle-orm";
import { isNextBuildPhase, isOfflineDbError } from "@/lib/build/is-build-time";
import { db } from "@/lib/db";
import {
  codeSnippetAuditLogs,
  codeSnippetVersions,
  codeSnippets,
  type CodeSnippetRow
} from "@/lib/db/schema/code-snippets";
import { logSnippetAudit } from "@/lib/snippets/snippet-audit";
import type {
  RuntimeSnippetPayload,
  SnippetFormInput,
  SnippetPlacementConfig,
  SnippetStatus,
  SnippetType
} from "@/lib/snippets/types";
import {
  computeSnippetChecksum,
  validateSnippetInput,
  validationStatusFromResult
} from "@/lib/snippets/validation";
import { SNIPPET_STATUSES, SNIPPET_TYPES } from "@/lib/snippets/types";

function slugify(name: string) {
  const base = name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return base || `snippet-${Date.now()}`;
}

async function uniqueSlug(base: string, excludeId?: string) {
  let slug = slugify(base);
  let attempt = 0;
  while (attempt < 50) {
    const candidate = attempt === 0 ? slug : `${slug}-${attempt}`;
    const rows = await db
      .select({ id: codeSnippets.id })
      .from(codeSnippets)
      .where(eq(codeSnippets.slug, candidate))
      .limit(1);
    const hit = rows[0];
    if (!hit || hit.id === excludeId) {
      return candidate;
    }
    attempt += 1;
  }
  return `${slug}-${Date.now()}`;
}

function parseJsonArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === "string");
}

function parsePlacementConfig(value: unknown): SnippetPlacementConfig {
  if (!value || typeof value !== "object") {
    return { mode: "global" };
  }
  const row = value as Record<string, unknown>;
  const mode = row.mode;
  return {
    mode:
      mode === "route" || mode === "surface" || mode === "page_group" || mode === "global"
        ? mode
        : "global",
    pageGroup: typeof row.pageGroup === "string" ? row.pageGroup : null,
    allowOnLegalRoutes:
      row.allowOnLegalRoutes !== undefined ? Boolean(row.allowOnLegalRoutes) : undefined,
    allowScriptsOnLegal:
      row.allowScriptsOnLegal !== undefined ? Boolean(row.allowScriptsOnLegal) : undefined
  };
}

export function rowToRuntimePayload(row: CodeSnippetRow): RuntimeSnippetPayload {
  return {
    id: row.id,
    name: row.name,
    type: row.type as SnippetType,
    code: row.code,
    priority: row.priority,
    placementConfig: parsePlacementConfig(row.placementConfig),
    routePatterns: parseJsonArray(row.routePatterns),
    surfaceKeys: parseJsonArray(row.surfaceKeys),
    deviceTarget: row.deviceTarget as RuntimeSnippetPayload["deviceTarget"],
    userTarget: row.userTarget as RuntimeSnippetPayload["userTarget"],
    startsAt: row.startsAt ? row.startsAt.toISOString() : null,
    endsAt: row.endsAt ? row.endsAt.toISOString() : null
  };
}

function snapshotFromRow(row: CodeSnippetRow) {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    type: row.type,
    status: row.status,
    priority: row.priority,
    code: row.code,
    placement_config: row.placementConfig,
    route_patterns: row.routePatterns,
    surface_keys: row.surfaceKeys,
    device_target: row.deviceTarget,
    user_target: row.userTarget,
    starts_at: row.startsAt,
    ends_at: row.endsAt,
    notes: row.notes
  };
}

async function nextVersionNumber(snippetId: string) {
  const rows = await db
    .select({ max: sql<number>`coalesce(max(${codeSnippetVersions.versionNumber}), 0)` })
    .from(codeSnippetVersions)
    .where(eq(codeSnippetVersions.snippetId, snippetId));
  return Number(rows[0]?.max ?? 0) + 1;
}

async function createVersion(
  row: CodeSnippetRow,
  actorId: string | null,
  changeNote: string | null
) {
  const versionNumber = await nextVersionNumber(row.id);
  await db.insert(codeSnippetVersions).values({
    snippetId: row.id,
    versionNumber,
    code: row.code,
    configSnapshot: snapshotFromRow(row),
    changeNote,
    createdBy: actorId
  });
  return versionNumber;
}

export type ListSnippetsParams = {
  page?: number;
  pageSize?: number;
  status?: SnippetStatus | "";
  type?: SnippetType | "";
  search?: string;
  createdBy?: string;
  updatedFrom?: string;
  includeArchived?: boolean;
};

function buildListWhere(params: ListSnippetsParams): SQL | undefined {
  const clauses: SQL[] = [];

  if (!params.includeArchived) {
    clauses.push(isNull(codeSnippets.archivedAt));
  }

  if (params.status) {
    clauses.push(eq(codeSnippets.status, params.status));
  }

  if (params.type) {
    clauses.push(eq(codeSnippets.type, params.type));
  }

  if (params.createdBy?.trim()) {
    clauses.push(eq(codeSnippets.createdBy, params.createdBy.trim()));
  }

  if (params.updatedFrom?.trim()) {
    clauses.push(sql`${codeSnippets.updatedAt} >= ${params.updatedFrom.trim()}::timestamptz`);
  }

  const search = params.search?.trim();
  if (search) {
    const pattern = `%${search.replace(/[%_]/g, "")}%`;
    clauses.push(
      or(ilike(codeSnippets.name, pattern), ilike(codeSnippets.slug, pattern), ilike(codeSnippets.description, pattern))!
    );
  }

  if (clauses.length === 0) return undefined;
  return and(...clauses);
}

export async function listCodeSnippets(params: ListSnippetsParams = {}) {
  const page = Math.max(1, params.page ?? 1);
  const pageSize = Math.min(50, Math.max(5, params.pageSize ?? 20));
  const offset = (page - 1) * pageSize;
  const where = buildListWhere(params);

  const [items, totalResult] = await Promise.all([
    db
      .select()
      .from(codeSnippets)
      .where(where)
      .orderBy(asc(codeSnippets.priority), desc(codeSnippets.updatedAt))
      .limit(pageSize)
      .offset(offset),
    db.select({ total: count() }).from(codeSnippets).where(where)
  ]);

  const total = Number(totalResult[0]?.total ?? 0);
  return {
    items,
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize))
  };
}

export async function getCodeSnippetById(id: string) {
  const rows = await db.select().from(codeSnippets).where(eq(codeSnippets.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function loadActiveRuntimeSnippets(): Promise<RuntimeSnippetPayload[]> {
  if (isNextBuildPhase()) {
    return [];
  }

  try {
    const now = new Date();
    const rows = await db
      .select()
      .from(codeSnippets)
      .where(
        and(
          eq(codeSnippets.status, "active"),
          isNull(codeSnippets.archivedAt),
          or(isNull(codeSnippets.startsAt), sql`${codeSnippets.startsAt} <= ${now}`),
          or(isNull(codeSnippets.endsAt), sql`${codeSnippets.endsAt} >= ${now}`)
        )
      )
      .orderBy(asc(codeSnippets.priority), desc(codeSnippets.updatedAt));

    return rows.map(rowToRuntimePayload);
  } catch (error) {
    if (isOfflineDbError(error)) {
      return [];
    }
    throw error;
  }
}

function normalizeInput(input: SnippetFormInput) {
  if (!SNIPPET_TYPES.includes(input.type)) {
    throw new Error("Loại snippet không hợp lệ.");
  }
  if (!SNIPPET_STATUSES.includes(input.status)) {
    throw new Error("Trạng thái không hợp lệ.");
  }
}

export async function createCodeSnippet(
  input: SnippetFormInput,
  actorId: string | null
) {
  normalizeInput(input);
  const validation = validateSnippetInput(input);
  if (validation.blocked) {
    throw new Error(validation.message);
  }

  const slug = await uniqueSlug(input.name);
  const checksum = computeSnippetChecksum(input.code);
  const validationStatus = validationStatusFromResult(validation);

  const [row] = await db
    .insert(codeSnippets)
    .values({
      name: input.name.trim(),
      slug,
      description: input.description?.trim() || null,
      type: input.type,
      status: input.status,
      code: input.code,
      priority: input.priority,
      placementConfig: input.placementConfig,
      routePatterns: input.routePatterns,
      surfaceKeys: input.surfaceKeys,
      deviceTarget: input.deviceTarget,
      userTarget: input.userTarget,
      startsAt: input.startsAt ? new Date(input.startsAt) : null,
      endsAt: input.endsAt ? new Date(input.endsAt) : null,
      notes: input.notes?.trim() || null,
      checksum,
      lastValidationStatus: validationStatus,
      lastValidationMessage: validation.message,
      createdBy: actorId,
      updatedBy: actorId
    })
    .returning();

  await createVersion(row, actorId, input.changeNote ?? "Tạo mới");
  await logSnippetAudit({
    snippetId: row.id,
    action: "create",
    actorId,
    afterSnapshot: snapshotFromRow(row)
  });

  return row;
}

export async function updateCodeSnippet(
  id: string,
  input: SnippetFormInput,
  actorId: string | null
) {
  const existing = await getCodeSnippetById(id);
  if (!existing || existing.archivedAt) {
    throw new Error("Snippet không tồn tại.");
  }

  normalizeInput(input);
  const validation = validateSnippetInput(input);
  if (validation.blocked) {
    throw new Error(validation.message);
  }

  const before = snapshotFromRow(existing);
  const checksum = computeSnippetChecksum(input.code);
  const validationStatus = validationStatusFromResult(validation);

  const [row] = await db
    .update(codeSnippets)
    .set({
      name: input.name.trim(),
      description: input.description?.trim() || null,
      type: input.type,
      status: input.status,
      code: input.code,
      priority: input.priority,
      placementConfig: input.placementConfig,
      routePatterns: input.routePatterns,
      surfaceKeys: input.surfaceKeys,
      deviceTarget: input.deviceTarget,
      userTarget: input.userTarget,
      startsAt: input.startsAt ? new Date(input.startsAt) : null,
      endsAt: input.endsAt ? new Date(input.endsAt) : null,
      notes: input.notes?.trim() || null,
      checksum,
      lastValidationStatus: validationStatus,
      lastValidationMessage: validation.message,
      updatedBy: actorId,
      updatedAt: new Date()
    })
    .where(eq(codeSnippets.id, id))
    .returning();

  await createVersion(row, actorId, input.changeNote ?? "Cập nhật");
  await logSnippetAudit({
    snippetId: row.id,
    action: input.status === "active" ? "activate" : "update",
    actorId,
    beforeSnapshot: before,
    afterSnapshot: snapshotFromRow(row)
  });

  return row;
}

export async function setCodeSnippetStatus(
  id: string,
  status: SnippetStatus,
  actorId: string | null,
  changeNote?: string | null
) {
  const existing = await getCodeSnippetById(id);
  if (!existing) throw new Error("Snippet không tồn tại.");
  const before = snapshotFromRow(existing);

  const [row] = await db
    .update(codeSnippets)
    .set({ status, updatedBy: actorId, updatedAt: new Date() })
    .where(eq(codeSnippets.id, id))
    .returning();

  await createVersion(row, actorId, changeNote ?? `Đổi trạng thái → ${status}`);
  await logSnippetAudit({
    snippetId: id,
    action: status === "active" ? "activate" : "disable",
    actorId,
    beforeSnapshot: before,
    afterSnapshot: snapshotFromRow(row)
  });

  return row;
}

export async function archiveCodeSnippet(id: string, actorId: string | null) {
  const existing = await getCodeSnippetById(id);
  if (!existing) throw new Error("Snippet không tồn tại.");
  const before = snapshotFromRow(existing);

  const [row] = await db
    .update(codeSnippets)
    .set({
      status: "inactive",
      archivedAt: new Date(),
      updatedBy: actorId,
      updatedAt: new Date()
    })
    .where(eq(codeSnippets.id, id))
    .returning();

  await logSnippetAudit({
    snippetId: id,
    action: "delete",
    actorId,
    beforeSnapshot: before,
    afterSnapshot: snapshotFromRow(row)
  });

  return row;
}

export async function duplicateCodeSnippet(id: string, actorId: string | null) {
  const existing = await getCodeSnippetById(id);
  if (!existing) throw new Error("Snippet không tồn tại.");

  return createCodeSnippet(
    {
      name: `${existing.name} (bản sao)`,
      description: existing.description,
      type: existing.type as SnippetType,
      status: "draft",
      code: existing.code,
      priority: existing.priority + 1,
      placementConfig: parsePlacementConfig(existing.placementConfig),
      routePatterns: parseJsonArray(existing.routePatterns),
      surfaceKeys: parseJsonArray(existing.surfaceKeys),
      deviceTarget: existing.deviceTarget as SnippetFormInput["deviceTarget"],
      userTarget: existing.userTarget as SnippetFormInput["userTarget"],
      startsAt: existing.startsAt?.toISOString() ?? null,
      endsAt: existing.endsAt?.toISOString() ?? null,
      notes: existing.notes,
      changeNote: "Nhân bản"
    },
    actorId
  );
}

export async function listSnippetVersions(snippetId: string) {
  return db
    .select()
    .from(codeSnippetVersions)
    .where(eq(codeSnippetVersions.snippetId, snippetId))
    .orderBy(desc(codeSnippetVersions.versionNumber));
}

export async function rollbackCodeSnippet(
  snippetId: string,
  versionId: string,
  actorId: string | null,
  changeNote?: string | null
) {
  const existing = await getCodeSnippetById(snippetId);
  if (!existing) throw new Error("Snippet không tồn tại.");

  const versions = await db
    .select()
    .from(codeSnippetVersions)
    .where(eq(codeSnippetVersions.id, versionId))
    .limit(1);
  const version = versions[0];
  if (!version || version.snippetId !== snippetId) {
    throw new Error("Phiên bản không tồn tại.");
  }

  const config = (version.configSnapshot ?? {}) as Record<string, unknown>;
  const before = snapshotFromRow(existing);

  const [row] = await db
    .update(codeSnippets)
    .set({
      code: version.code,
      type: (config.type as string) ?? existing.type,
      priority: Number(config.priority ?? existing.priority),
      placementConfig: config.placement_config ?? existing.placementConfig,
      routePatterns: config.route_patterns ?? existing.routePatterns,
      surfaceKeys: config.surface_keys ?? existing.surfaceKeys,
      deviceTarget: (config.device_target as string) ?? existing.deviceTarget,
      userTarget: (config.user_target as string) ?? existing.userTarget,
      status: "inactive",
      checksum: computeSnippetChecksum(version.code),
      updatedBy: actorId,
      updatedAt: new Date()
    })
    .where(eq(codeSnippets.id, snippetId))
    .returning();

  await createVersion(row, actorId, changeNote ?? `Rollback v${version.versionNumber}`);
  await logSnippetAudit({
    snippetId,
    action: "rollback",
    actorId,
    beforeSnapshot: before,
    afterSnapshot: snapshotFromRow(row)
  });

  return row;
}

export async function listSnippetAuditLogs(snippetId: string, limit = 50) {
  return db
    .select()
    .from(codeSnippetAuditLogs)
    .where(eq(codeSnippetAuditLogs.snippetId, snippetId))
    .orderBy(desc(codeSnippetAuditLogs.createdAt))
    .limit(limit);
}

export type SnippetExportBundle = {
  version: 1;
  exportedAt: string;
  snippets: Array<{
    name: string;
    description: string | null;
    type: SnippetType;
    status: "draft" | "inactive";
    code: string;
    priority: number;
    placementConfig: SnippetPlacementConfig;
    routePatterns: string[];
    surfaceKeys: string[];
    deviceTarget: SnippetFormInput["deviceTarget"];
    userTarget: SnippetFormInput["userTarget"];
    startsAt: string | null;
    endsAt: string | null;
    notes: string | null;
  }>;
};

export async function exportSnippetsByIds(ids: string[]): Promise<SnippetExportBundle> {
  if (!ids.length) {
    return { version: 1, exportedAt: new Date().toISOString(), snippets: [] };
  }
  const rows = await db.select().from(codeSnippets).where(inArray(codeSnippets.id, ids));
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    snippets: rows.map((row) => ({
      name: row.name,
      description: row.description,
      type: row.type as SnippetType,
      status: "draft" as const,
      code: row.code,
      priority: row.priority,
      placementConfig: parsePlacementConfig(row.placementConfig),
      routePatterns: parseJsonArray(row.routePatterns),
      surfaceKeys: parseJsonArray(row.surfaceKeys),
      deviceTarget: row.deviceTarget as SnippetFormInput["deviceTarget"],
      userTarget: row.userTarget as SnippetFormInput["userTarget"],
      startsAt: row.startsAt?.toISOString() ?? null,
      endsAt: row.endsAt?.toISOString() ?? null,
      notes: row.notes
    }))
  };
}

export async function importSnippetsBundle(
  bundle: SnippetExportBundle,
  actorId: string | null
) {
  const created = [];
  for (const item of bundle.snippets ?? []) {
    const row = await createCodeSnippet(
      {
        ...item,
        status: "draft",
        confirmHighRisk: false,
        changeNote: "Import JSON"
      },
      actorId
    );
    created.push(row);
  }
  await logSnippetAudit({
    snippetId: null,
    action: "import",
    actorId,
    afterSnapshot: { count: created.length, ids: created.map((r) => r.id) }
  });
  return created;
}
