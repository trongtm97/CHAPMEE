"use server";

import { revalidatePath } from "next/cache";
import { recheckAudioItem, updateAudioItemAdminAction, updateAudioPolicySettings } from "@/lib/admin/audio-admin";
import { parseAudioPolicySettings } from "@/lib/settings/audio-policy-settings";

export async function runAudioAdminItemAction(formData: FormData) {
  const audioId = String(formData.get("audio_id") ?? "").trim();
  const action = String(formData.get("action") ?? "").trim() as
    | "publish"
    | "hide"
    | "reject"
    | "mark_broken"
    | "mark_copyright_disputed"
    | "mark_rights_verified"
    | "disable_ads"
    | "enable_ads"
    | "disable_continuous_playback"
    | "mark_ok";
  if (!audioId || !action) return;
  await updateAudioItemAdminAction({ audioId, action });
  revalidatePath("/admin/audio");
  revalidatePath("/admin/audio/review");
  revalidatePath("/admin/audio/broken-links");
}

export async function runAudioRecheckAction(formData: FormData) {
  const audioId = String(formData.get("audio_id") ?? "").trim();
  if (!audioId) return;
  await recheckAudioItem(audioId);
  revalidatePath("/admin/audio");
  revalidatePath("/admin/audio/broken-links");
}

export async function updateAudioPolicyAction(formData: FormData) {
  const current = parseAudioPolicySettings({});
  const payload: Record<string, unknown> = {};
  for (const key of Object.keys(current)) {
    const raw = formData.get(key);
    if (typeof raw !== "string") continue;
    if (raw === "true" || raw === "false") {
      payload[key] = raw === "true";
    } else if (/^\d+$/.test(raw)) {
      payload[key] = Number(raw);
    } else if (key === "allowed_external_audio_domains" || key === "blocked_external_audio_domains") {
      payload[key] = raw
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
    } else {
      payload[key] = raw;
    }
  }
  await updateAudioPolicySettings(payload);
  revalidatePath("/admin/audio/policy");
}
