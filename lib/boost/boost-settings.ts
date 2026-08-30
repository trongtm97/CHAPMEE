import "server-only";

import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { isMissingSchemaError } from "@/lib/data/schema-errors";
import type { BoostSettings } from "@/types/story-boost";

const DEFAULTS: BoostSettings = {
  enabled: false,
  rewardPointBoostEnabled: true,
  coinBoostEnabled: false,
  currency: "reward_points",
  minBoostPoints: 10,
  pointsPerUnit: 10,
  boostPointsPerUnit: 10,
  userDailyCap: 100,
  storyDailyCap: 500,
  minStoryAgeHours: 24,
  decayHalfLifeDays: 7,
  rankingWeight: 1,
  organicBlendMax: 0,
  diminishingSameStory: 0.5,
  allowCreatorSelfBoost: false,
  showPublicMessages: true,
  antiWhaleCapEnabled: true
};

function parseJsonValue(raw: unknown): unknown {
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw);
    } catch {
      return raw;
    }
  }
  return raw;
}

function toBool(value: unknown, fallback: boolean) {
  if (typeof value === "boolean") return value;
  if (value === "true" || value === true) return true;
  if (value === "false" || value === false) return false;
  return fallback;
}

function toNumber(value: unknown, fallback: number) {
  const parsed = Number(parseJsonValue(value));
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toStringValue(value: unknown, fallback: string) {
  const parsed = parseJsonValue(value);
  return typeof parsed === "string" ? parsed : fallback;
}

export async function getBoostSettings(): Promise<BoostSettings> {
  try {
    const result = await db.execute(sql`
      select key, value
      from public.engagement_settings
      where key like 'boost.%'
    `);

    const map = new Map<string, unknown>();
    for (const row of result.rows as Array<{ key: string; value: unknown }>) {
      map.set(row.key, row.value);
    }

    const pointsPerUnit = toNumber(map.get("boost.points_per_unit"), DEFAULTS.pointsPerUnit);

    return {
      enabled: toBool(map.get("boost.enabled"), DEFAULTS.enabled),
      rewardPointBoostEnabled: toBool(
        map.get("boost.reward_point_boost_enabled"),
        DEFAULTS.rewardPointBoostEnabled
      ),
      coinBoostEnabled: toBool(map.get("boost.coin_boost_enabled"), DEFAULTS.coinBoostEnabled),
      currency: toStringValue(map.get("boost.currency"), DEFAULTS.currency) as BoostSettings["currency"],
      minBoostPoints: toNumber(map.get("boost.min_boost_points"), pointsPerUnit),
      pointsPerUnit,
      boostPointsPerUnit: toNumber(
        map.get("boost.boost_points_per_unit"),
        DEFAULTS.boostPointsPerUnit
      ),
      userDailyCap: toNumber(map.get("boost.user_daily_cap"), DEFAULTS.userDailyCap),
      storyDailyCap: toNumber(map.get("boost.story_daily_cap"), DEFAULTS.storyDailyCap),
      minStoryAgeHours: toNumber(map.get("boost.min_story_age_hours"), DEFAULTS.minStoryAgeHours),
      decayHalfLifeDays: toNumber(map.get("boost.decay_half_life_days"), DEFAULTS.decayHalfLifeDays),
      rankingWeight: toNumber(map.get("boost.ranking_weight"), DEFAULTS.rankingWeight),
      organicBlendMax: toNumber(map.get("boost.organic_blend_max"), DEFAULTS.organicBlendMax),
      diminishingSameStory: toNumber(
        map.get("boost.diminishing_same_story"),
        DEFAULTS.diminishingSameStory
      ),
      allowCreatorSelfBoost: toBool(
        map.get("boost.allow_creator_self_boost"),
        DEFAULTS.allowCreatorSelfBoost
      ),
      showPublicMessages: toBool(map.get("boost.show_public_messages"), DEFAULTS.showPublicMessages),
      antiWhaleCapEnabled: toBool(
        map.get("boost.anti_whale_cap_enabled"),
        DEFAULTS.antiWhaleCapEnabled
      )
    };
  } catch (error) {
    if (isMissingSchemaError(error)) {
      return DEFAULTS;
    }
    throw error;
  }
}

export async function updateBoostSetting(key: string, value: unknown) {
  await db.execute(sql`
    insert into public.engagement_settings (key, value, updated_at)
    values (${key}, ${JSON.stringify(value)}::jsonb, now())
    on conflict (key) do update set
      value = excluded.value,
      updated_at = excluded.updated_at
  `);
}

export async function getBoostSettingsForAdmin() {
  return getBoostSettings();
}
