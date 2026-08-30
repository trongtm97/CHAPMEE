"use server";

import { revalidatePath } from "next/cache";
import {
  recheckFilmAdaptation,
  updateFilmAdaptationAdminAction,
  updateFilmAdaptationPolicySettings
} from "@/lib/admin/film-adaptations-admin";
import { parseFilmAdaptationPolicySettings } from "@/lib/settings/film-adaptation-settings";

export async function runFilmAdminItemAction(formData: FormData) {
  const filmId = String(formData.get("film_id") ?? "").trim();
  const action = String(formData.get("action") ?? "").trim() as
    | "publish"
    | "hide"
    | "reject"
    | "mark_unavailable"
    | "mark_copyright_disputed"
    | "mark_rights_verified"
    | "disable_ads"
    | "enable_ads"
    | "mark_ok";
  if (!filmId || !action) return;
  await updateFilmAdaptationAdminAction({ filmId, action });
  revalidatePath("/admin/film-adaptations");
  revalidatePath("/admin/film-adaptations/review");
  revalidatePath("/admin/film-adaptations/unavailable");
}

export async function runFilmRecheckAction(formData: FormData) {
  const filmId = String(formData.get("film_id") ?? "").trim();
  if (!filmId) return;
  await recheckFilmAdaptation(filmId);
  revalidatePath("/admin/film-adaptations");
  revalidatePath("/admin/film-adaptations/unavailable");
}

export async function updateFilmPolicyAction(formData: FormData) {
  const current = parseFilmAdaptationPolicySettings({});
  const payload: Record<string, unknown> = {};
  for (const key of Object.keys(current)) {
    const raw = formData.get(key);
    if (typeof raw !== "string") continue;
    if (raw === "true" || raw === "false") {
      payload[key] = raw === "true";
    } else if (/^\d+$/.test(raw)) {
      payload[key] = Number(raw);
    } else {
      payload[key] = raw;
    }
  }
  await updateFilmAdaptationPolicySettings(payload);
  revalidatePath("/admin/film-adaptations/policy");
}
