#!/usr/bin/env node
/**
 * Creates ChapChap RBAC test users (local/staging only).
 *
 * Usage:
 *   node scripts/rbac-setup-test-users.mjs
 *   node scripts/rbac-setup-test-users.mjs --password "YourLocalPassword1!"
 *
 * Requires in .env.local:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const TEST_USERS = [
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
  const raw = readFileSync(path, "utf8");
  for (const line of raw.split("\n")) {
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
  if (idx >= 0 && process.argv[idx + 1]) return process.argv[idx + 1];
  return process.env.RBAC_TEST_PASSWORD ?? "ChapChapTest!2026";
}

function canActorAssignRole(actorRoles, targetRole) {
  if (targetRole === "owner") return actorRoles.includes("owner");
  if (targetRole === "super_admin") {
    return actorRoles.includes("owner") || actorRoles.includes("super_admin");
  }
  return true;
}

async function main() {
  loadEnvLocal();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const password = parsePasswordArg();

  if (!url || !serviceKey) {
    console.error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local"
    );
    process.exit(1);
  }

  if (/prod|production/i.test(url) && !process.env.RBAC_ALLOW_PROD_SETUP) {
    console.error(
      "Refusing to create test users on production URL. Set RBAC_ALLOW_PROD_SETUP=1 to override."
    );
    process.exit(1);
  }

  const admin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  const { data: roles, error: rolesError } = await admin.from("roles").select("id, code");
  if (rolesError) {
    console.error("Could not load roles:", rolesError.message);
    process.exit(1);
  }
  const roleByCode = new Map(roles.map((r) => [r.code, r.id]));

  console.log(`Setting up ${TEST_USERS.length} test users (password: [hidden])`);

  for (const spec of TEST_USERS) {
    let userId = null;
    const list = await admin.auth.admin.listUsers({ perPage: 200 });
    const existing = list.data?.users?.find((u) => u.email === spec.email);

    if (existing) {
      userId = existing.id;
      await admin.auth.admin.updateUserById(userId, { password });
      console.log(`  ~ ${spec.email} (exists, password reset)`);
    } else {
      const created = await admin.auth.admin.createUser({
        email: spec.email,
        password,
        email_confirm: true
      });
      if (created.error) {
        console.error(`  x ${spec.email}:`, created.error.message);
        continue;
      }
      userId = created.data.user.id;
      console.log(`  + ${spec.email}`);
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

    await admin.from("profiles").upsert({
      id: userId,
      username: spec.key,
      display_name: `Test ${spec.key}`,
      role: legacyRole,
      status: profileStatus
    });

    await admin.from("user_roles").delete().eq("user_id", userId);

    for (const code of spec.roles) {
      const roleId = roleByCode.get(code);
      if (!roleId) {
        console.warn(`    ! role missing: ${code}`);
        continue;
      }
      await admin.from("user_roles").insert({
        user_id: userId,
        role_id: roleId
      });
    }
  }

  console.log("\nAssign-role policy sanity (TS mirror):");
  for (const row of [
    { actor: ["admin"], target: "owner", expected: "deny" },
    { actor: ["owner"], target: "super_admin", expected: "allow" }
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
