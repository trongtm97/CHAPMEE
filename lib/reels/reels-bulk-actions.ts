"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";
import { assertOwnsReelsItem } from "@/lib/reels/assert-reels-ownership";
import { studioReelsPath } from "@/lib/routes/reels-paths";
import { createClient } from "@/lib/supabase/server";

async function getOwnerId() {
  const { profile } = await getCurrentUser();

  if (!profile?.id) {
    return { error: "Bạn cần đăng nhập.", profileId: null };
  }

  return { error: null, profileId: profile.id };
}

function revalidate() {
  revalidatePath(studioReelsPath());
}

export async function bulkHideReelsAction(reelIds: string[]) {
  const { error, profileId } = await getOwnerId();

  if (!profileId) {
    return {
      error: error ?? undefined,
      failedCount: reelIds.length,
      ok: false,
      successCount: 0
    };
  }

  const supabase = await createClient();
  let successCount = 0;
  let failedCount = 0;

  for (const reelId of reelIds) {
    try {
      await assertOwnsReelsItem(profileId, reelId);
      const { error: updateError } = await supabase
        .from("reels_items")
        .update({ status: "hidden" })
        .eq("id", reelId)
        .eq("owner_id", profileId)
        .eq("status", "published");

      if (updateError) {
        failedCount += 1;
      } else {
        successCount += 1;
      }
    } catch {
      failedCount += 1;
    }
  }

  if (successCount > 0) {
    revalidate();
  }

  return {
    error: failedCount > 0 ? "Một số Reels không ẩn được." : undefined,
    failedCount,
    ok: successCount > 0,
    successCount
  };
}

export async function bulkUnhideReelsAction(reelIds: string[]) {
  const { error, profileId } = await getOwnerId();

  if (!profileId) {
    return {
      error: error ?? undefined,
      failedCount: reelIds.length,
      ok: false,
      successCount: 0
    };
  }

  const supabase = await createClient();
  let successCount = 0;
  let failedCount = 0;

  for (const reelId of reelIds) {
    try {
      await assertOwnsReelsItem(profileId, reelId);
      const { error: updateError } = await supabase
        .from("reels_items")
        .update({ status: "published" })
        .eq("id", reelId)
        .eq("owner_id", profileId)
        .eq("status", "hidden");

      if (updateError) {
        failedCount += 1;
      } else {
        successCount += 1;
      }
    } catch {
      failedCount += 1;
    }
  }

  if (successCount > 0) {
    revalidate();
  }

  return {
    error: failedCount > 0 ? "Một số Reels không hiện lại được." : undefined,
    failedCount,
    ok: successCount > 0,
    successCount
  };
}

export async function bulkMoveReelsToDraftAction(reelIds: string[]) {
  const { error, profileId } = await getOwnerId();

  if (!profileId) {
    return {
      error: error ?? undefined,
      failedCount: reelIds.length,
      ok: false,
      successCount: 0
    };
  }

  const supabase = await createClient();
  let successCount = 0;
  let failedCount = 0;

  for (const reelId of reelIds) {
    try {
      await assertOwnsReelsItem(profileId, reelId);
      const { error: updateError } = await supabase
        .from("reels_items")
        .update({ status: "draft" })
        .eq("id", reelId)
        .eq("owner_id", profileId)
        .in("status", ["published", "hidden", "rejected"]);

      if (updateError) {
        failedCount += 1;
      } else {
        successCount += 1;
      }
    } catch {
      failedCount += 1;
    }
  }

  if (successCount > 0) {
    revalidate();
  }

  return {
    error: failedCount > 0 ? "Một số Reels không chuyển được." : undefined,
    failedCount,
    ok: successCount > 0,
    successCount
  };
}

export async function bulkDeleteReelsAction(reelIds: string[]) {
  const { error, profileId } = await getOwnerId();

  if (!profileId) {
    return {
      error: error ?? undefined,
      failedCount: reelIds.length,
      ok: false,
      successCount: 0
    };
  }

  const supabase = await createClient();
  let successCount = 0;
  let failedCount = 0;

  for (const reelId of reelIds) {
    try {
      const record = await assertOwnsReelsItem(profileId, reelId);

      if (record.status !== "draft") {
        failedCount += 1;
        continue;
      }

      const { error: deleteError } = await supabase
        .from("reels_items")
        .delete()
        .eq("id", reelId)
        .eq("owner_id", profileId);

      if (deleteError) {
        failedCount += 1;
      } else {
        successCount += 1;
      }
    } catch {
      failedCount += 1;
    }
  }

  if (successCount > 0) {
    revalidate();
  }

  return {
    error:
      failedCount > 0
        ? "Chỉ xóa được Reels nháp. Một số mục không xóa được."
        : undefined,
    failedCount,
    ok: successCount > 0,
    successCount
  };
}

export async function exportReelsCsvAction(reelIds: string[]) {
  const { error, profileId } = await getOwnerId();

  if (!profileId) {
    return { csv: null, error: error ?? "Không xuất được." };
  }

  const supabase = await createClient();
  const { data, error: fetchError } = await supabase
    .from("reels_items")
    .select("id, hook, body, status, view_count, cta_click_count, stories(title)")
    .eq("owner_id", profileId)
    .in("id", reelIds);

  if (fetchError) {
    return { csv: null, error: fetchError.message };
  }

  const header = ["ID", "Hook", "Trạng thái", "Lượt xem", "CTA", "Truyện"];
  const rows = (data ?? []).map((row) => {
    const story = Array.isArray(row.stories) ? row.stories[0] : row.stories;
    return [
      row.id,
      `"${String(row.hook).replace(/"/g, '""')}"`,
      row.status,
      String(row.view_count ?? 0),
      String(row.cta_click_count ?? 0),
      `"${String(story?.title ?? "").replace(/"/g, '""')}"`
    ].join(",");
  });

  return {
    csv: [header.join(","), ...rows].join("\n"),
    error: null
  };
}
