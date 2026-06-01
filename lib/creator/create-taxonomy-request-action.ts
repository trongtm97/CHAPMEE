"use server";

import { getCurrentCreatorProfile } from "@/lib/creator/getCreatorProfile";
import { createTaxonomyRequest } from "@/lib/taxonomy/requests";
import { CREATOR_ASSIGNABLE_TAXONOMY_TYPES } from "@/lib/taxonomy/constants";
import type { TaxonomyType } from "@/types/taxonomy";

export type TaxonomyRequestActionState = {
  error: string | null;
  ok: boolean;
};

export async function createTaxonomyRequestAction(
  _previous: TaxonomyRequestActionState,
  formData: FormData
): Promise<TaxonomyRequestActionState> {
  const { user, creatorProfile } = await getCurrentCreatorProfile();

  if (!user) {
    return { ok: false, error: "Cần đăng nhập." };
  }

  if (!creatorProfile) {
    return { ok: false, error: "Cần bật tài khoản tác giả (Studio)." };
  }

  const type = String(formData.get("type") ?? "");
  if (!CREATOR_ASSIGNABLE_TAXONOMY_TYPES.includes(type as TaxonomyType)) {
    return { ok: false, error: "Nhóm taxonomy không hợp lệ." };
  }

  if (type === "presentation_mode" || type === "age_rating") {
    return { ok: false, error: "Nhóm này do hệ thống quản lý, không gửi yêu cầu." };
  }

  const relatedRaw = String(formData.get("related_existing_term_id") ?? "").trim();

  const result = await createTaxonomyRequest(user.id, {
    type: type as TaxonomyType,
    name: String(formData.get("name") ?? ""),
    description: String(formData.get("description") ?? "") || null,
    exampleUsage: String(formData.get("example_usage") ?? "") || null,
    relatedExistingTermId: relatedRaw || null
  });

  if (result.error || !result.data) {
    return { ok: false, error: result.error ?? "Không gửi được yêu cầu." };
  }

  return { ok: true, error: null };
}
