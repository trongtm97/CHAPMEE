/**
 * Creates ChapMee RBAC test users (local/staging only).
 *
 * Usage:
 *   npx tsx scripts/rbac-setup-test-users.ts
 *   npx tsx scripts/rbac-setup-test-users.ts --password "YourLocalPassword1!"
 *
 * Requires in .env.local: DATABASE_URL, BETTER_AUTH_SECRET
 */

import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { sql } from "drizzle-orm";
import { upsertSeedAuthUser } from "@/lib/auth/seed-auth-user";
import { db } from "@/lib/db";

type TestUserSpec = {
  key: string;
  email: string;
  roles: string[];
  profileStatus?: string;
};

const TEST_USERS: TestUserSpec[] = [
  { key: "reader", email: "test_reader@chapchap.test", roles: ["reader"] },
  { key: "creator", email: "test_creator@chapchap.test", roles: ["creator"] },
  {
    key: "verified_creator",
    email: "test_verified_creator@chapchap.test",
    roles: ["verified_creator"]
  },
  { key: "moderator", email: "test_moderator@chapchap.test", roles: ["moderator"] },
  {
    key: "content_admin",
    email: "test_content_admin@chapchap.test",
    roles: ["content_admin"]
  },
  {
    key: "finance_admin",
    email: "test_finance_admin@chapchap.test",
    roles: ["finance_admin"]
  },
  {
    key: "support_admin",
    email: "test_support_admin@chapchap.test",
    roles: ["support_admin"]
  },
  { key: "admin", email: "test_admin@chapchap.test", roles: ["admin"] },
  {
    key: "super_admin",
    email: "test_super_admin@chapchap.test",
    roles: ["super_admin"]
  },
  { key: "owner", email: "test_owner@chapchap.test", roles: ["owner"] },
  {
    key: "banned",
    email: "test_banned@chapchap.test",
    roles: ["banned_user"],
    profileStatus: "banned"
  }
];

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

function parsePasswordArg() {
  const idx = process.argv.indexOf("--password");
  if (idx >= 0 && process.argv[idx + 1]?.trim()) {
    return process.argv[idx + 1].trim();
  }
  const fromEnv = process.env.RBAC_TEST_PASSWORD?.trim();
  if (fromEnv) return fromEnv;
  return "ChapChapTest!2026";
}

function canActorAssignRole(actorRoles: string[], targetRole: string) {
  if (targetRole === "owner") return actorRoles.includes("owner");
  if (targetRole === "super_admin") {
    return actorRoles.includes("owner") || actorRoles.includes("super_admin");
  }
  return true;
}

async function main() {
  loadEnvLocal();

  if (!process.env.DATABASE_URL) {
    console.error("Missing DATABASE_URL in .env.local");
    process.exit(1);
  }
  if (!process.env.BETTER_AUTH_SECRET) {
    console.error("Missing BETTER_AUTH_SECRET in .env.local");
    process.exit(1);
  }

  const password = parsePasswordArg();

  const rolesResult = await db.execute(sql`select id, code from public.roles`);
  const roles = rolesResult.rows as { id: string; code: string }[];
  const roleByCode = new Map(roles.map((r) => [r.code, r.id]));

  console.log(`Setting up ${TEST_USERS.length} test users (password: [hidden])`);

  for (const spec of TEST_USERS) {
    let userId: string;
    try {
      const result = await upsertSeedAuthUser({
        email: spec.email,
        password,
        displayName: `Test ${spec.key}`,
        emailVerified: true
      });
      userId = result.userId;
      console.log(`  ${result.created ? "+" : "~"} ${spec.email}`);
    } catch (error) {
      console.error(
        `  x ${spec.email}:`,
        error instanceof Error ? error.message : error
      );
      continue;
    }

    const profileStatus = spec.profileStatus ?? "active";
    const legacyRole =
      spec.roles.includes("owner") || spec.roles.includes("super_admin")
        ? "founder"
        : spec.roles.includes("admin")
          ? "admin"
          : spec.roles.includes("moderator") ||
              spec.roles.includes("content_admin") ||
              spec.roles.includes("support_admin")
            ? "moderator"
            : "user";

    await db.execute(sql`
      insert into public.profiles (id, username, display_name, role, status, created_at, updated_at)
      values (
        ${userId}::uuid,
        ${spec.key},
        ${`Test ${spec.key}`},
        ${legacyRole}::public.profile_role,
        ${profileStatus},
        now(),
        now()
      )
      on conflict (id) do update set
        username = excluded.username,
        display_name = excluded.display_name,
        role = excluded.role,
        status = excluded.status,
        updated_at = now()
    `);

    await db.execute(sql`delete from public.user_roles where user_id = ${userId}::uuid`);

    for (const code of spec.roles) {
      const roleId = roleByCode.get(code);
      if (!roleId) {
        console.warn(`    ! role missing: ${code}`);
        continue;
      }
      await db.execute(sql`
        insert into public.user_roles (user_id, role_id)
        values (${userId}::uuid, ${roleId}::uuid)
        on conflict do nothing
      `);
    }
  }

  console.log("\nAssign-role policy sanity (TS mirror):");
  for (const row of [
    { actor: ["admin"], target: "owner", expected: "deny" as const },
    { actor: ["owner"], target: "super_admin", expected: "allow" as const }
  ]) {
    const ok = canActorAssignRole(row.actor, row.target);
    const pass = (ok ? "allow" : "deny") === row.expected;
    console.log(
      `  ${pass ? "OK" : "FAIL"} ${row.actor.join(",")} -> ${row.target}: ${ok ? "allow" : "deny"}`
    );
  }

  console.log("\nDone. Run: npm run test:rbac");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
