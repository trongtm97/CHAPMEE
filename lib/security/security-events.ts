import "server-only";

import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { isMissingSchemaError } from "@/lib/data/schema-errors";

export type SecurityEventType =
  | "rate_limit_hit"
  | "suspicious_reader_velocity"
  | "challenge_required"
  | "challenge_passed"
  | "challenge_failed"
  | "blocked_request"
  | "content_access_denied";

export type RecordSecurityEventInput = {
  eventType: SecurityEventType;
  profileId?: string | null;
  ipHash?: string | null;
  userAgent?: string | null;
  path?: string | null;
  method?: string | null;
  metadata?: Record<string, unknown>;
};

export async function recordSecurityEvent(input: RecordSecurityEventInput) {
  try {
    await db.execute(sql`
      insert into public.security_events (
        event_type,
        profile_id,
        ip_hash,
        user_agent,
        path,
        method,
        metadata
      )
      values (
        ${input.eventType},
        ${input.profileId ?? null}::uuid,
        ${input.ipHash ?? null},
        ${input.userAgent ?? null},
        ${input.path ?? null},
        ${input.method ?? null},
        ${JSON.stringify(input.metadata ?? {})}::jsonb
      )
    `);
  } catch (error) {
    if (isMissingSchemaError(error)) {
      console.warn("[security_events] table missing", input.eventType);
      return;
    }
    console.warn("[security_events] insert failed", error);
  }
}

export async function getSecurityEventsPaged(options?: {
  page?: number;
  pageSize?: number;
  eventType?: string;
}) {
  const page = Math.max(1, options?.page ?? 1);
  const pageSize = Math.min(Math.max(options?.pageSize ?? 20, 1), 50);
  const offset = (page - 1) * pageSize;
  const eventType = (options?.eventType ?? "").trim();

  try {
    const typeFilter = eventType ? sql`event_type = ${eventType}` : sql`true`;

    const countResult = await db.execute(sql`
      select count(*)::int as total
      from public.security_events
      where ${typeFilter}
    `);
    const total = (countResult.rows[0] as { total: number } | undefined)?.total ?? 0;

    const result = await db.execute(sql`
      select
        id,
        event_type,
        profile_id,
        ip_hash,
        user_agent,
        path,
        method,
        metadata,
        created_at
      from public.security_events
      where ${typeFilter}
      order by created_at desc
      limit ${pageSize}
      offset ${offset}
    `);

    return {
      items: result.rows as Array<{
        id: string;
        event_type: string;
        profile_id: string | null;
        ip_hash: string | null;
        user_agent: string | null;
        path: string | null;
        method: string | null;
        metadata: Record<string, unknown>;
        created_at: string;
      }>,
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize))
    };
  } catch (error) {
    if (isMissingSchemaError(error)) {
      return { items: [], total: 0, page: 1, pageSize, totalPages: 1 };
    }
    throw error;
  }
}

export async function getRecentSecurityEvents(limit = 50) {
  try {
    const result = await db.execute(sql`
      select
        id,
        event_type,
        profile_id,
        ip_hash,
        path,
        method,
        metadata,
        created_at
      from public.security_events
      order by created_at desc
      limit ${limit}
    `);

    return result.rows as Array<{
      id: string;
      event_type: string;
      profile_id: string | null;
      ip_hash: string | null;
      path: string | null;
      method: string | null;
      metadata: Record<string, unknown>;
      created_at: string;
    }>;
  } catch (error) {
    if (isMissingSchemaError(error)) {
      return [];
    }
    throw error;
  }
}

export async function getSecurityEventStats(sinceHours = 24) {
  try {
    const result = await db.execute(sql`
      select
        event_type,
        count(*)::int as total
      from public.security_events
      where created_at >= now() - (${sinceHours}::int * interval '1 hour')
      group by event_type
      order by total desc
    `);

    const paths = await db.execute(sql`
      select path, count(*)::int as total
      from public.security_events
      where created_at >= now() - (${sinceHours}::int * interval '1 hour')
        and path is not null
      group by path
      order by total desc
      limit 15
    `);

    return {
      byType: result.rows as Array<{ event_type: string; total: number }>,
      topPaths: paths.rows as Array<{ path: string; total: number }>
    };
  } catch (error) {
    if (isMissingSchemaError(error)) {
      return { byType: [], topPaths: [] };
    }
    throw error;
  }
}

export async function getTopSuspiciousIpHashes(options?: {
  sinceHours?: number;
  limit?: number;
}) {
  const sinceHours = options?.sinceHours ?? 24;
  const limit = Math.min(Math.max(options?.limit ?? 10, 1), 50);

  try {
    const result = await db.execute(sql`
      select
        ip_hash,
        count(*)::int as total
      from public.security_events
      where created_at >= now() - (${sinceHours}::int * interval '1 hour')
        and ip_hash is not null
      group by ip_hash
      order by total desc
      limit ${limit}
    `);

    return (result.rows as Array<{ ip_hash: string; total: number }>).map((row) => ({
      ipHash: row.ip_hash,
      total: row.total
    }));
  } catch (error) {
    if (isMissingSchemaError(error)) {
      return [];
    }
    throw error;
  }
}

export async function getTopSuspiciousUserAgents(options?: {
  sinceHours?: number;
  limit?: number;
}) {
  const sinceHours = options?.sinceHours ?? 24;
  const limit = Math.min(Math.max(options?.limit ?? 10, 1), 50);

  try {
    const result = await db.execute(sql`
      select
        user_agent,
        count(*)::int as total
      from public.security_events
      where created_at >= now() - (${sinceHours}::int * interval '1 hour')
        and user_agent is not null
      group by user_agent
      order by total desc
      limit ${limit}
    `);

    return (result.rows as Array<{ user_agent: string; total: number }>).map((row) => ({
      userAgent: row.user_agent,
      total: row.total
    }));
  } catch (error) {
    if (isMissingSchemaError(error)) {
      return [];
    }
    throw error;
  }
}
