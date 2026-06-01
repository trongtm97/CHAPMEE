import { createAdminClient } from "@/lib/supabase/admin";

export type RebuildAdRevenueStatsInput = {
  from: string;
  to: string;
};

export type RebuildAdRevenueStatsResult = {
  ok: boolean;
  dailyRows?: number;
  monthlyUpserts?: number;
  warnings: string[];
  error?: string;
};

function isValidDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export async function rebuildAdRevenueStats(
  input: RebuildAdRevenueStatsInput
): Promise<RebuildAdRevenueStatsResult> {
  const warnings: string[] = [];

  if (!isValidDate(input.from) || !isValidDate(input.to)) {
    return { ok: false, warnings, error: "from/to phải có định dạng YYYY-MM-DD." };
  }

  if (input.from > input.to) {
    return { ok: false, warnings, error: "from không được sau to." };
  }

  try {
    const supabase = createAdminClient();

    const { count: orphanCount } = await supabase
      .from("ad_render_events")
      .select("id", { count: "exact", head: true })
      .eq("event_type", "rendered")
      .gte("created_at", `${input.from}T00:00:00.000Z`)
      .lte("created_at", `${input.to}T23:59:59.999Z`)
      .is("story_id", null)
      .is("chapter_id", null);

    if ((orphanCount ?? 0) > 0) {
      warnings.push(
        `${orphanCount} sự kiện rendered không gắn story/chapter — đã bỏ qua khi không resolve được tác giả.`
      );
    }

    const { data: dailyResult, error: dailyError } = await supabase.rpc("rebuild_ad_daily_stats", {
      p_from: input.from,
      p_to: input.to
    });

    if (dailyError) {
      return { ok: false, warnings, error: dailyError.message };
    }

    const dailyPayload = dailyResult as { ok?: boolean; error?: string; daily_rows?: number };
    if (dailyPayload?.ok === false) {
      return { ok: false, warnings, error: dailyPayload.error ?? "Rebuild daily thất bại." };
    }

    const { data: monthlyResult, error: monthlyError } = await supabase.rpc("rebuild_ad_monthly_stats", {
      p_from: input.from,
      p_to: input.to
    });

    if (monthlyError) {
      return { ok: false, warnings, error: monthlyError.message };
    }

    const monthlyPayload = monthlyResult as {
      ok?: boolean;
      error?: string;
      monthly_upserts?: number;
    };
    if (monthlyPayload?.ok === false) {
      return { ok: false, warnings, error: monthlyPayload.error ?? "Rebuild monthly thất bại." };
    }

    return {
      ok: true,
      dailyRows: dailyPayload?.daily_rows ?? 0,
      monthlyUpserts: monthlyPayload?.monthly_upserts ?? 0,
      warnings
    };
  } catch {
    return { ok: false, warnings, error: "Rebuild ad revenue stats thất bại." };
  }
}
