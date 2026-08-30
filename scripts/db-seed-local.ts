/**
 * Local development seed: demo users + published stories/episodes/analytics.
 *
 * Prerequisites: npm run db:setup (or db:migrate + db:legacy + db:shims)
 *
 * Usage:
 *   npm run db:seed
 *   npm run db:seed -- --password "YourPassword1!"
 *   npm run db:seed -- --skip-content
 *   npm run db:seed -- --with-rbac
 *   npm run db:seed -- --with-content-posts
 */

import { resolve } from "node:path";
import pg from "pg";
import { sql } from "drizzle-orm";
import { loadEnvLocal } from "./lib/load-env-local";
import { DEMO_USERS } from "./seed/demo-users";
import { runSqlFile } from "./seed/run-sql-file";
import { upsertSeedAuthUser } from "@/lib/auth/seed-auth-user";
import { db } from "@/lib/db";

function parsePassword() {
  const idx = process.argv.indexOf("--password");
  if (idx >= 0 && process.argv[idx + 1]?.trim()) {
    return process.argv[idx + 1].trim();
  }
  const fromEnv =
    process.env.SEED_DEMO_PASSWORD?.trim() ||
    process.env.RBAC_TEST_PASSWORD?.trim();
  if (fromEnv) return fromEnv;
  return "ChapChapDev!2026";
}

function hasFlag(flag: string) {
  return process.argv.includes(flag);
}

async function seedContentPostsHubDev() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL missing");

  const client = new pg.Client({ connectionString: databaseUrl });
  await client.connect();
  try {
    const seedPath = resolve(process.cwd(), "scripts/seed/content-posts-hub-dev.sql");
    console.log("\n→ Content posts hub (DEV sample for /bai-viet) …");
    await runSqlFile(client, seedPath);
  } finally {
    await client.end();
  }
}

async function seedSeoContentBlocksDev() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL missing");

  const client = new pg.Client({ connectionString: databaseUrl });
  await client.connect();
  try {
    const seedPath = resolve(process.cwd(), "scripts/seed/seo-content-blocks-dev.sql");
    console.log("\n→ SEO content blocks (DEV sample for /truyen) …");
    await runSqlFile(client, seedPath);
  } finally {
    await client.end();
  }
}

async function upsertDemoUser(password: string, spec: (typeof DEMO_USERS)[number]) {
  const { userId, created } = await upsertSeedAuthUser({
    email: spec.email,
    password,
    displayName: spec.displayName,
    emailVerified: true
  });
  console.log(`  ${created ? "+" : "~"} ${spec.email}`);

  await db.execute(sql`
    insert into public.profiles (
      id, username, display_name, role, status, created_at, updated_at
    )
    values (
      ${userId}::uuid,
      ${spec.username},
      ${spec.displayName},
      ${spec.profileRole}::public.profile_role,
      'active',
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

  const rolesResult = await db.execute(sql`select id, code from public.roles`);
  const roleByCode = new Map(
    (rolesResult.rows as { id: string; code: string }[]).map((r) => [
      r.code,
      r.id
    ])
  );

  await db.execute(sql`delete from public.user_roles where user_id = ${userId}::uuid`);

  for (const code of spec.roles) {
    const roleId = roleByCode.get(code);
    if (!roleId) {
      console.warn(`    ! role not found: ${code}`);
      continue;
    }
    await db.execute(sql`
      insert into public.user_roles (user_id, role_id)
      values (${userId}::uuid, ${roleId}::uuid)
      on conflict do nothing
    `);
  }

  if (spec.createCreatorProfile) {
    const penName = spec.penName ?? spec.displayName;
    await db.execute(sql`
      insert into public.creator_profiles (user_id, pen_name, bio, status, created_at, updated_at)
      values (
        ${userId}::uuid,
        ${penName},
        ${"Tài khoản creator mẫu cho môi trường local."},
        'active'::public.creator_status,
        '1970-01-01'::timestamptz,
        now()
      )
      on conflict (user_id) do update set
        pen_name = excluded.pen_name,
        bio = excluded.bio,
        status = excluded.status,
        created_at = '1970-01-01'::timestamptz,
        updated_at = now()
    `);

    await db.execute(sql`
      insert into public.creator_monetization_profiles (
        user_id,
        status,
        monetization_enabled,
        terms_accepted_at,
        kyc_status,
        payout_enabled
      )
      values (
        ${userId}::uuid,
        'approved',
        true,
        now(),
        'verified',
        true
      )
      on conflict (user_id) do update set
        status = 'approved',
        monetization_enabled = true,
        terms_accepted_at = coalesce(public.creator_monetization_profiles.terms_accepted_at, now()),
        kyc_status = 'verified',
        payout_enabled = true,
        updated_at = now()
    `);
  }

  return userId;
}

async function enableLocalMonetizationFlags() {
  await db.execute(sql`
    update public.monetization_settings
    set value = 'true'::jsonb, updated_at = now()
    where key in (
      'monetization.enabled',
      'monetization.show_money_ui_to_users',
      'monetization.show_money_ui_to_creators',
      'creator_monetization.enabled'
    )
  `);
}

async function enableLocalBoostEngagement() {
  await db.execute(sql`
    insert into public.engagement_settings (key, value)
    values ('boost.enabled', 'true'::jsonb)
    on conflict (key) do update
    set value = 'true'::jsonb, updated_at = now()
  `);
}

/** Inline daily stats refresh — avoids importing server-only boost modules from tsx. */
async function refreshStoryBoostDailyStatsForSeed(storyId: string) {
  const weightResult = await db.execute(sql`
    select value
    from public.engagement_settings
    where key = 'boost.ranking_weight'
    limit 1
  `);
  const rawWeight = (weightResult.rows[0] as { value?: unknown } | undefined)?.value;
  const rankingWeight =
    typeof rawWeight === "number"
      ? rawWeight
      : Number.parseFloat(String(rawWeight ?? "1")) || 1;

  await db.execute(sql`
    insert into public.story_boost_daily_stats (
      story_id,
      stat_date,
      total_boost_points,
      unique_boosters,
      decayed_score,
      boost_count
    )
    select
      ${storyId}::uuid,
      current_date,
      coalesce(sum(boost_points), 0),
      count(distinct user_id)::int,
      coalesce(sum(boost_points), 0) * ${rankingWeight},
      count(*)::int
    from public.story_boosts
    where story_id = ${storyId}::uuid
      and decay_group = current_date
      and engagement_source = 'user'
      and is_counted_in_ranking = true
      and status = 'completed'
    on conflict (story_id, stat_date) do update set
      total_boost_points = excluded.total_boost_points,
      unique_boosters = excluded.unique_boosters,
      decayed_score = excluded.decayed_score,
      boost_count = excluded.boost_count
  `);
}

/** DEV-only sample boosts for /bang-xep-hang/duoc-de-cu UI validation. */
async function seedDemoStoryBoosts() {
  const databaseUrl = process.env.DATABASE_URL ?? "";
  if (!isLocalDatabaseUrl(databaseUrl)) {
    console.log("\n→ Skip demo story boosts (DATABASE_URL does not look local).");
    return;
  }

  const profiles = await db.execute(sql`
    select id, username
    from public.profiles
    where username in ('demoreader', 'demoadmin')
  `);
  const byUsername = new Map(
    (profiles.rows as Array<{ id: string; username: string }>).map((row) => [
      row.username,
      row.id
    ])
  );
  const readerId = byUsername.get("demoreader");
  const adminId = byUsername.get("demoadmin");
  if (!readerId || !adminId) {
    console.warn("\n→ Skip demo story boosts (demo profiles missing).");
    return;
  }

  const storiesResult = await db.execute(sql`
    select s.id
    from public.stories s
    inner join public.creator_profiles cp on cp.id = s.creator_id
    inner join public.profiles p on p.id = cp.user_id
    where s.status in ('published', 'approved')
      and s.visibility = 'public'
      and p.username = 'democreator'
    order by s.published_at desc nulls last
    limit 4
  `);
  const storyIds = (storiesResult.rows as Array<{ id: string }>).map((row) => row.id);
  if (storyIds.length === 0) {
    console.warn("\n→ Skip demo story boosts (no published demo creator stories).");
    return;
  }

  for (const userId of [readerId, adminId]) {
    await db.execute(sql`
      insert into public.user_reward_points (user_id, balance, lifetime_earned, updated_at)
      values (${userId}::uuid, 500, 500, now())
      on conflict (user_id) do update
      set
        balance = greatest(public.user_reward_points.balance, 500),
        updated_at = now()
    `);
  }

  const boosters = [
    { userId: readerId, points: 20 },
    { userId: adminId, points: 15 }
  ];

  for (const storyId of storyIds) {
    for (const booster of boosters) {
      await db.execute(sql`
        insert into public.story_boosts (
          story_id,
          user_id,
          currency,
          amount_spent,
          boost_points,
          engagement_source,
          is_counted_in_ranking,
          status,
          metadata
        )
        select
          ${storyId}::uuid,
          ${booster.userId}::uuid,
          'reward_points',
          10,
          ${booster.points},
          'user',
          true,
          'completed',
          '{"seed":"local-dev"}'::jsonb
        where not exists (
          select 1
          from public.story_boosts b
          where b.story_id = ${storyId}::uuid
            and b.user_id = ${booster.userId}::uuid
            and b.engagement_source = 'user'
            and b.status = 'completed'
        )
      `);
    }
  }

  for (const storyId of storyIds) {
    await refreshStoryBoostDailyStatsForSeed(storyId);
  }

  console.log(
    `\n→ Demo story boosts: ${storyIds.length} stories (reader + admin) for BXH Được đề cử.`
  );
}

async function seedSeoDefaults() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL missing");

  const client = new pg.Client({ connectionString: databaseUrl });
  await client.connect();
  try {
    const seedPath = resolve(process.cwd(), "scripts/seed/seo-defaults.sql");
    console.log("\n→ SEO defaults …");
    await runSqlFile(client, seedPath);
  } finally {
    await client.end();
  }
}

async function seedFooterConfig() {
  const { defaultFooterConfig, FOOTER_CONFIG_KEY } = await import(
    "@/lib/settings/footer-config"
  );
  await db.execute(sql`
    insert into public.app_settings (key, value, is_public)
    values (
      ${FOOTER_CONFIG_KEY},
      ${JSON.stringify(defaultFooterConfig)}::jsonb,
      true
    )
    on conflict (key) do nothing
  `);
}

async function seedContentSql() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL missing");

  const client = new pg.Client({ connectionString: databaseUrl });
  await client.connect();
  try {
    const seedPath = resolve(process.cwd(), "db/seed.sql");
    console.log("\n→ Applying db/seed.sql …");
    await runSqlFile(client, seedPath);
  } finally {
    await client.end();
  }
}

function isLocalDatabaseUrl(databaseUrl: string) {
  return (
    databaseUrl.includes("localhost") ||
    databaseUrl.includes("127.0.0.1") ||
    databaseUrl.includes("host.docker.internal")
  );
}

async function seedDemoContentOriginSamples() {
  const databaseUrl = process.env.DATABASE_URL ?? "";
  if (!isLocalDatabaseUrl(databaseUrl)) {
    console.log(
      "\n→ Skip demo content_origin sample patch (DATABASE_URL does not look local)."
    );
    return;
  }

  const storiesResult = await db.execute(sql`
    select id, title
    from public.stories
    where status in ('published', 'approved')
      and visibility = 'public'
    order by created_at asc
    limit 60
  `);
  const stories = storiesResult.rows as Array<{ id: string; title: string | null }>;
  if (stories.length < 6) {
    console.warn(
      `\n→ Skip content_origin sample patch (need >= 6 stories, found ${stories.length}).`
    );
    return;
  }

  const selected = stories.slice(0, 6);
  const originals = selected.slice(0, 3);
  const translations = selected.slice(3, 6);

  for (const row of originals) {
    await db.execute(sql`
      update public.stories
      set
        content_origin = 'original',
        translation_type = null,
        rights_status = 'verified',
        monetization_policy = 'full',
        source_title = null,
        source_author_name = null,
        source_url = null,
        source_platform = null,
        license_note = null,
        rights_review_note = '[DEMO] Original story sample for local validation.',
        updated_at = now()
      where id = ${row.id}::uuid
    `);
  }

  const translationStates = [
    {
      rightsStatus: "unverified",
      policy: "free_only",
      titleSuffix: "[DEMO Translation - Unverified]",
      note: "Demo translation pending rights verification."
    },
    {
      rightsStatus: "verified",
      policy: "ads_tips_allowed",
      titleSuffix: "[DEMO Translation - Verified Ads/Tips]",
      note: "Demo translation verified for ads/tips only."
    },
    {
      rightsStatus: "rejected",
      policy: "no_monetization",
      titleSuffix: "[DEMO Translation - Rejected]",
      note: "Demo translation rejected: no monetization allowed."
    }
  ] as const;

  for (let index = 0; index < translations.length; index += 1) {
    const row = translations[index]!;
    const state = translationStates[index]!;
    const baseTitle = (row.title ?? `Demo Story ${index + 1}`).replace(
      /\s*\[DEMO Translation[^\]]*\]\s*/gi,
      ""
    );
    await db.execute(sql`
      update public.stories
      set
        title = ${`${baseTitle} ${state.titleSuffix}`},
        content_origin = 'translation',
        translation_type = 'fan_translation',
        rights_status = ${state.rightsStatus},
        monetization_policy = ${state.policy},
        original_language = 'en',
        translated_language = 'vi',
        source_title = ${`Demo source title ${index + 1}`},
        source_author_name = ${`Demo source author ${index + 1}`},
        source_url = ${`https://example.local/demo-translation-${index + 1}`},
        source_platform = 'Demo Fiction Hub',
        license_note = ${state.note},
        rights_review_note = ${`[DEMO] ${state.note}`},
        updated_at = now()
      where id = ${row.id}::uuid
    `);
  }

  console.log("\n→ Demo content_origin samples ready:");
  console.log(`  Original stories: ${originals.length}`);
  console.log(`  Translation stories: ${translations.length}`);
}

async function printSummary(password: string) {
  const stories = await db.execute(sql`
    select count(*)::int as c from public.stories where status = 'published'
  `);
  const episodes = await db.execute(sql`
    select count(*)::int as c from public.episodes where status = 'published'
  `);
  const storyCount = (stories.rows[0] as { c: number }).c;
  const episodeCount = (episodes.rows[0] as { c: number }).c;

  console.log("\n--- Local demo accounts ---");
  for (const u of DEMO_USERS) {
    console.log(`  ${u.email}  (${u.roles.join(", ")})`);
  }
  console.log(`  Password: ${password}`);
  console.log(`\n  Stories (published): ${storyCount}`);
  console.log(`  Episodes (published): ${episodeCount}`);
  console.log("\n  Login: http://localhost:3000/login");
  console.log("  Discover: http://localhost:3000/discover");
  console.log("  Được đề cử: http://localhost:3000/bang-xep-hang/duoc-de-cu");
  console.log("  Studio (creator): http://localhost:3000/studio");
  console.log("  Admin: http://localhost:3000/admin");
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

  const password = parsePassword();
  const skipContent = hasFlag("--skip-content");
  const withRbac = hasFlag("--with-rbac");

  console.log("ChapMee local seed");
  console.log(`  Users: ${DEMO_USERS.length}`);
  console.log(`  Content SQL: ${skipContent ? "skip" : "yes"}`);
  console.log(`  RBAC test users: ${withRbac ? "after seed" : "no"}`);

  console.log("\n→ Demo users …");
  for (const spec of DEMO_USERS) {
    await upsertDemoUser(password, spec);
  }

  console.log("\n→ Local monetization flags (dev-friendly) …");
  await enableLocalMonetizationFlags();

  console.log("\n→ Boost engagement (dev) …");
  await enableLocalBoostEngagement();

  console.log("\n→ Footer config (defaults) …");
  await seedFooterConfig();

  await seedSeoDefaults();

  if (hasFlag("--with-seo-content")) {
    await seedSeoContentBlocksDev();
  }

  if (hasFlag("--with-content-posts")) {
    await seedContentPostsHubDev();
  }

  if (!skipContent) {
    await seedContentSql();
    await seedDemoContentOriginSamples();
    await seedDemoStoryBoosts();
  }

  if (withRbac) {
    console.log("\n→ RBAC test users (test:rbac:setup) …");
    const { spawnSync } = await import("node:child_process");
    const result = spawnSync(
      "npm",
      ["run", "test:rbac:setup", "--", "--password", password],
      { stdio: "inherit", shell: true, cwd: process.cwd() }
    );
    if (result.status !== 0) {
      process.exit(result.status ?? 1);
    }
  }

  await printSummary(password);
  console.log("\nDone.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
