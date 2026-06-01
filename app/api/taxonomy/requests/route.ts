import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";
import { getCurrentCreatorProfile } from "@/lib/creator/getCreatorProfile";
import { createTaxonomyRequest } from "@/lib/taxonomy/requests";
import { TAXONOMY_TYPES } from "@/types/taxonomy";
import type { TaxonomyType } from "@/types/taxonomy";

function parseTaxonomyType(value: unknown): TaxonomyType | null {
  if (typeof value !== "string") return null;
  return TAXONOMY_TYPES.includes(value as TaxonomyType)
    ? (value as TaxonomyType)
    : null;
}

export async function POST(request: Request) {
  const { user } = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Cần đăng nhập." }, { status: 401 });
  }

  const { creatorProfile } = await getCurrentCreatorProfile();
  if (!creatorProfile) {
    return NextResponse.json(
      { error: "Cần bật tài khoản tác giả (Studio)." },
      { status: 403 }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "JSON không hợp lệ." }, { status: 400 });
  }

  const type = parseTaxonomyType(body.type);
  if (!type) {
    return NextResponse.json({ error: "type không hợp lệ." }, { status: 400 });
  }

  if (type === "editorial_tag" || type === "monetization_access") {
    return NextResponse.json(
      { error: "Không thể yêu cầu nhãn hệ thống." },
      { status: 400 }
    );
  }

  const result = await createTaxonomyRequest(user.id, {
    type,
    name: String(body.name ?? ""),
    description:
      typeof body.description === "string" ? body.description : null,
    exampleUsage:
      typeof body.example_usage === "string" ? body.example_usage : null,
    relatedExistingTermId:
      typeof body.related_existing_term_id === "string"
        ? body.related_existing_term_id
        : null
  });

  if (result.error || !result.data) {
    return NextResponse.json(
      { error: result.error ?? "Không tạo được yêu cầu." },
      { status: 400 }
    );
  }

  return NextResponse.json({ data: result.data }, { status: 201 });
}
