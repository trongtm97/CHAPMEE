/**
 * Automated RBAC matrix tests (permissions RPC + RLS probes).
 *
 *   npm run test:rbac:setup
 *   npm run test:rbac
 *
 * Writes: scripts/rbac-test-report.md
 */

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { getPostgrestAdminHeaders } from "@/lib/auth/postgrest-headers";
import { signPostgrestJwt } from "@/lib/auth/postgrest-jwt";
import { createDatabaseClient } from "@/lib/db/postgrest/create-client";
import type { DatabaseClient } from "@/lib/db/types";

const PASS = "PASS";
const FAIL = "FAIL";
const SKIP = "SKIP";

const TEST_USERS = [
  { key: "reader", email: "test_reader@chapchap.test", role: "reader" },
  { key: "creator", email: "test_creator@chapchap.test", role: "creator" },
  {
    key: "verified_creator",
    email: "test_verified_creator@chapchap.test",
    role: "verified_creator"
  },
  { key: "moderator", email: "test_moderator@chapchap.test", role: "moderator" },
  {
    key: "content_admin",
    email: "test_content_admin@chapchap.test",
    role: "content_admin"
  },
  {
    key: "finance_admin",
    email: "test_finance_admin@chapchap.test",
    role: "finance_admin"
  },
  {
    key: "support_admin",
    email: "test_support_admin@chapchap.test",
    role: "support_admin"
  },
  { key: "admin", email: "test_admin@chapchap.test", role: "admin" },
  { key: "super_admin", email: "test_super_admin@chapchap.test", role: "super_admin" },
  { key: "owner", email: "test_owner@chapchap.test", role: "owner" },
  { key: "banned", email: "test_banned@chapchap.test", role: "banned_user" }
] as const;

/** Keep in sync with lib/rbac/role-matrix.ts */
const ROLE_MATRIX: Record<
  string,
  { mustHave: string[]; mustNotHave: string[] }
> = {
  reader: {
    mustHave: ["comment.create", "wallet.view.own", "wallet.purchase", "save.create"],
    mustNotHave: [
      "finance.dashboard.view",
      "story.approve",
      "admin.dashboard.view",
      "story.create"
    ]
  },
  creator: {
    mustHave: ["story.create", "creator.payout.request"],
    mustNotHave: ["finance.payout.approve", "story.approve"]
  },
  verified_creator: {
    mustHave: ["chapter.set_vip", "creator.payout.view.own"],
    mustNotHave: ["finance.payout.approve"]
  },
  moderator: {
    mustHave: ["comment.moderate", "moderation.ban_user"],
    mustNotHave: ["finance.dashboard.view", "finance.wallet.adjust", "story.approve"]
  },
  content_admin: {
    mustHave: ["story.approve", "story.moderate"],
    mustNotHave: ["finance.wallet.adjust", "finance.payout.approve"]
  },
  finance_admin: {
    mustHave: [
      "finance.dashboard.view",
      "finance.payout.approve",
      "finance.wallet.adjust"
    ],
    mustNotHave: ["story.approve", "comment.moderate"]
  },
  support_admin: {
    mustHave: ["feedback.view.all", "admin.user.view"],
    mustNotHave: ["finance.wallet.adjust", "finance.payout.approve"]
  },
  admin: {
    mustHave: ["admin.dashboard.view", "admin.audit.view"],
    mustNotHave: ["finance.wallet.adjust", "admin.user.role.assign"]
  },
  super_admin: {
    mustHave: ["admin.user.role.assign", "finance.dashboard.view"],
    mustNotHave: ["finance.wallet.adjust"]
  },
  owner: {
    mustHave: ["finance.wallet.adjust", "admin.user.role.assign"],
    mustNotHave: []
  },
  banned_user: {
    mustHave: [],
    mustNotHave: ["comment.create", "story.create"]
  }
};

type ResultRow = {
  section: string;
  name: string;
  status: string;
  detail: string;
};

function loadEnvLocal() {
  const path = resolve(process.cwd(), ".env.local");
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

function record(results: ResultRow[], section: string, name: string, status: string, detail = "") {
  results.push({ section, name, status, detail });
}

function clientForUser(userId: string): DatabaseClient | null {
  const token = signPostgrestJwt({ sub: userId, role: "authenticated" });
  if (!token) return null;
  return createDatabaseClient({
    headers: { Authorization: `Bearer ${token}` }
  });
}

function anonClient(): DatabaseClient {
  return createDatabaseClient();
}

function adminClient(): DatabaseClient {
  return createDatabaseClient({ headers: getPostgrestAdminHeaders() });
}

async function resolveUserId(
  admin: DatabaseClient,
  email: string
): Promise<{ userId: string | null; error: string | null }> {
  const { data, error } = await admin.auth.admin.listUsers({ perPage: 200 });
  if (error) {
    return { userId: null, error: error.message };
  }
  const user = data?.users?.find((u) => u.email === email);
  if (!user) {
    return { userId: null, error: "user not found — run npm run test:rbac:setup" };
  }
  return { userId: user.id, error: null };
}

async function hasPermission(client: DatabaseClient, userId: string, code: string) {
  const { data, error } = await client.rpc("user_has_permission", {
    input_user_id: userId,
    permission_code: code
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true, value: data === true };
}

async function main() {
  loadEnvLocal();

  if (!process.env.DATABASE_URL) {
    console.error("Missing DATABASE_URL in .env.local");
    process.exit(1);
  }

  if (!signPostgrestJwt({ sub: "00000000-0000-0000-0000-000000000001" })) {
    console.error(
      "Missing POSTGREST_JWT_SECRET (or BETTER_AUTH_SECRET) — set POSTGREST_JWT_SECRET to match docker PGRST_JWT_SECRET"
    );
    process.exit(1);
  }

  const results: ResultRow[] = [];
  const startedAt = new Date().toISOString();
  const admin = adminClient();

  {
    const guest = anonClient();
    const { error } = await guest.from("comments").insert({
      user_id: "00000000-0000-0000-0000-000000000001",
      story_id: "00000000-0000-0000-0000-000000000001",
      content: "rbac-test-guest"
    });
    const denied = Boolean(error);
    record(
      results,
      "guest",
      "comment insert denied",
      denied ? PASS : FAIL,
      error?.message ?? "insert succeeded"
    );
  }

  const userIds: Record<string, string> = {};

  for (const spec of TEST_USERS) {
    const { userId, error } = await resolveUserId(admin, spec.email);
    if (error || !userId) {
      record(results, spec.role, `resolve ${spec.email}`, SKIP, error ?? "no user");
      continue;
    }
    userIds[spec.key] = userId;

    const client = clientForUser(userId);
    if (!client) {
      record(results, spec.role, "postgrest jwt", SKIP, "could not sign JWT");
      continue;
    }

    const matrix = ROLE_MATRIX[spec.role];
    if (!matrix) continue;

    for (const code of matrix.mustHave) {
      const check = await hasPermission(client, userId, code);
      const pass = check.ok && check.value;
      record(
        results,
        spec.role,
        `must have ${code}`,
        pass ? PASS : FAIL,
        pass ? "" : (check.error ?? "false")
      );
    }

    for (const code of matrix.mustNotHave) {
      const check = await hasPermission(client, userId, code);
      const pass = check.ok && !check.value;
      record(
        results,
        spec.role,
        `must not have ${code}`,
        pass ? PASS : FAIL,
        pass ? "" : (check.error ?? "true")
      );
    }

    if (spec.role === "banned_user") {
      const { data: blocked } = await client.rpc("is_user_write_blocked", {
        input_user_id: userId
      });
      record(
        results,
        spec.role,
        "is_user_write_blocked",
        blocked === true ? PASS : FAIL,
        String(blocked)
      );
    }

    if (spec.role === "finance_admin") {
      const { data: fin } = await client.rpc("is_finance_staff", {
        input_user_id: userId
      });
      record(
        results,
        spec.role,
        "is_finance_staff",
        fin === true ? PASS : FAIL,
        String(fin)
      );
    }

    if (spec.role === "moderator") {
      const { data: fin } = await client.rpc("is_finance_staff", {
        input_user_id: userId
      });
      record(
        results,
        spec.role,
        "not finance staff",
        fin === false ? PASS : FAIL,
        String(fin)
      );
    }
  }

  const readerId = userIds.reader;
  const ownerId = userIds.owner;
  const creatorId = userIds.creator;

  if (readerId && ownerId) {
    const client = clientForUser(readerId);
    if (!client) {
      record(results, "rls", "reader cannot read owner wallet", SKIP, "no jwt");
    } else {
      const { data, error } = await client
        .from("user_wallets")
        .select("user_id, paid_coin_balance")
        .eq("user_id", ownerId);
      const rows = (data as unknown[] | null) ?? [];
      const denied = Boolean(error) || rows.length === 0;
      record(
        results,
        "rls",
        "reader cannot read owner wallet",
        denied ? PASS : FAIL,
        error?.message ?? `rows=${rows.length}`
      );
    }
  } else {
    record(results, "rls", "reader cannot read owner wallet", SKIP, "missing users");
  }

  if (readerId) {
    const client = clientForUser(readerId);
    if (!client) {
      record(results, "rls", "reader cannot bump own balance via update", SKIP, "no jwt");
    } else {
      const { error } = await client
        .from("user_wallets")
        .update({ paid_coin_balance: 99999 })
        .eq("user_id", readerId);
      record(
        results,
        "rls",
        "reader cannot bump own balance via update",
        error ? PASS : FAIL,
        error?.message ?? "update succeeded"
      );
    }
  }

  if (readerId) {
    const { data: roleRow } = await admin
      .from("roles")
      .select("id")
      .eq("code", "moderator")
      .maybeSingle();
    const client = clientForUser(readerId);
    if (!client) {
      record(results, "rls", "reader cannot self-assign moderator role", SKIP, "no jwt");
    } else {
      const { error } = await client.from("user_roles").insert({
        user_id: readerId,
        role_id: (roleRow as { id?: string } | null)?.id
      });
      record(
        results,
        "rls",
        "reader cannot self-assign moderator role",
        error ? PASS : FAIL,
        error?.message ?? "insert succeeded"
      );
    }
  }

  if (readerId) {
    const client = clientForUser(readerId);
    if (!client) {
      record(results, "rls", "reader cannot read admin_audit_logs", SKIP, "no jwt");
    } else {
      const { data, error } = await client.from("admin_audit_logs").select("id").limit(1);
      const rows = (data as unknown[] | null) ?? [];
      const denied = Boolean(error) || rows.length === 0;
      record(
        results,
        "rls",
        "reader cannot read admin_audit_logs",
        denied ? PASS : FAIL,
        error?.message ?? `rows=${rows.length}`
      );
    }
  }

  if (creatorId) {
    const client = clientForUser(creatorId);
    const { data: payouts } = await admin
      .from("payout_requests")
      .select("id, status")
      .eq("creator_user_id", creatorId)
      .limit(1);
    const payoutRows = (payouts as { id: string }[] | null) ?? [];
    if (!client) {
      record(results, "rls", "creator cannot approve own payout row", SKIP, "no jwt");
    } else if (payoutRows.length) {
      const { error } = await client
        .from("payout_requests")
        .update({ status: "approved" })
        .eq("id", payoutRows[0].id);
      record(
        results,
        "rls",
        "creator cannot approve own payout row",
        error ? PASS : FAIL,
        error?.message ?? "update succeeded"
      );
    } else {
      record(results, "rls", "creator cannot approve own payout row", SKIP, "no payout row");
    }
  }

  if (userIds.owner) {
    const client = clientForUser(userIds.owner);
    const { data: perms } = await admin.from("permissions").select("code");
    if (!client) {
      record(results, "owner", "has all DB permissions", SKIP, "no jwt");
    } else {
      let failCount = 0;
      for (const row of (perms as { code: string }[] | null) ?? []) {
        const check = await hasPermission(client, userIds.owner, row.code);
        if (!check.ok || !check.value) failCount += 1;
      }
      record(
        results,
        "owner",
        "has all DB permissions",
        failCount === 0 ? PASS : FAIL,
        failCount ? `${failCount} missing` : ""
      );
    }
  }

  const failRows = results.filter((r) => r.status === FAIL);
  const passCount = results.filter((r) => r.status === PASS).length;
  const skipCount = results.filter((r) => r.status === SKIP).length;

  const reportPath = resolve(process.cwd(), "scripts/rbac-test-report.md");
  const lines = [
    "# RBAC matrix test report",
    "",
    `- Started: ${startedAt}`,
    `- Total: ${results.length} | PASS: ${passCount} | FAIL: ${failRows.length} | SKIP: ${skipCount}`,
    "",
    "## Summary",
    "",
    failRows.length === 0
      ? "All automated checks passed (or skipped)."
      : `**${failRows.length} failure(s)** — see below.`,
    "",
    "## Results",
    "",
    "| Section | Check | Status | Detail |",
    "|---------|-------|--------|--------|",
    ...results.map(
      (r) =>
        `| ${r.section} | ${r.name} | ${r.status} | ${r.detail.replace(/\|/g, "\\|")} |`
    ),
    "",
    "## Manual follow-up",
    "",
    "See `scripts/rbac-role-matrix-checklist.md` for route/UI/server-action checks.",
    ""
  ];

  writeFileSync(reportPath, lines.join("\n"), "utf8");

  console.log(`Report: ${reportPath}`);
  console.log(`PASS=${passCount} FAIL=${failRows.length} SKIP=${skipCount}`);

  if (failRows.length > 0) {
    for (const row of failRows) {
      console.log(`  FAIL [${row.section}] ${row.name}: ${row.detail}`);
    }
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
