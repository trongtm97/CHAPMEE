"use server";

import { redirect } from "next/navigation";
import {
  updateContentOriginPolicySettings,
  updateTranslationMonetizationPolicy,
  updateTranslationRightsStatus
} from "@/lib/admin/content-origin-admin";

export async function updateTranslationRightsStatusAction(formData: FormData) {
  const storyId = String(formData.get("story_id") ?? "").trim();
  const action = String(formData.get("rights_action") ?? "").trim() as
    | "verified"
    | "pending_review"
    | "rejected"
    | "expired"
    | "request_more_info";
  const rightsExpiresAt = String(formData.get("rights_expires_at") ?? "").trim();
  const rightsReviewNote = String(formData.get("rights_review_note") ?? "").trim();

  const result = await updateTranslationRightsStatus({
    storyId,
    action,
    rightsExpiresAt: rightsExpiresAt || null,
    rightsReviewNote: rightsReviewNote || null
  });

  if (!result.ok) {
    redirect(`/admin/translations/${storyId}?error=${encodeURIComponent(result.error ?? "Lỗi")}`);
  }
  redirect(`/admin/translations/${storyId}?success=rights_updated`);
}

export async function updateTranslationMonetizationPolicyAction(formData: FormData) {
  const storyId = String(formData.get("story_id") ?? "").trim();
  const monetizationPolicy = String(formData.get("monetization_policy") ?? "").trim() as
    | "free_only"
    | "ads_tips_allowed"
    | "no_monetization";
  const rightsReviewNote = String(formData.get("rights_review_note") ?? "").trim();

  const result = await updateTranslationMonetizationPolicy({
    storyId,
    monetizationPolicy,
    rightsReviewNote: rightsReviewNote || null
  });

  if (!result.ok) {
    redirect(`/admin/translations/${storyId}?error=${encodeURIComponent(result.error ?? "Lỗi")}`);
  }
  redirect(`/admin/translations/${storyId}?success=policy_updated`);
}

export async function updateContentOriginPolicySettingsAction(formData: FormData) {
  const bool = (key: string, fallback = false) =>
    formData.get(key) === "on" ? true : fallback;

  const defaultRightsStatus = String(
    formData.get("default_translation_rights_status") ?? "pending_review"
  ).trim();
  const defaultMonetizationPolicy = String(
    formData.get("default_translation_monetization_policy") ?? "free_only"
  ).trim();

  const result = await updateContentOriginPolicySettings({
    settings: {
      translation_ads_requires_verified_rights: bool(
        "translation_ads_requires_verified_rights",
        true
      ),
      translation_tips_requires_verified_rights: bool(
        "translation_tips_requires_verified_rights",
        true
      ),
      translation_boost_requires_verified_rights: bool(
        "translation_boost_requires_verified_rights",
        false
      ),
      original_full_monetization_enabled: bool("original_full_monetization_enabled", true),
      default_translation_rights_status:
        defaultRightsStatus === "unverified" ? "unverified" : "pending_review",
      default_translation_monetization_policy:
        defaultMonetizationPolicy === "no_monetization"
          ? "no_monetization"
          : "free_only"
    }
  });

  if (!result.ok) {
    redirect(`/admin/monetization-policies?error=${encodeURIComponent(result.error ?? "Lỗi")}`);
  }
  redirect("/admin/monetization-policies?success=1");
}
