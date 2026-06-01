import { NextResponse } from "next/server";
import {
  getFeaturedTaxonomyTerms,
  getTaxonomyTerms,
  getTaxonomyTree
} from "@/lib/taxonomy/queries";
import { TAXONOMY_TYPES } from "@/types/taxonomy";
import type { TaxonomyType } from "@/types/taxonomy";

function parseTaxonomyType(value: string | null): TaxonomyType | null {
  if (!value) return null;
  return TAXONOMY_TYPES.includes(value as TaxonomyType)
    ? (value as TaxonomyType)
    : null;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = parseTaxonomyType(searchParams.get("type"));

  if (!type) {
    return NextResponse.json(
      { error: "Tham số type không hợp lệ." },
      { status: 400 }
    );
  }

  const scope = searchParams.get("scope") ?? "active";
  const tree = searchParams.get("tree") === "1";
  const parentIdRaw = searchParams.get("parent_id");
  const parentId =
    parentIdRaw === "null" || parentIdRaw === ""
      ? parentIdRaw === "null"
        ? null
        : undefined
      : parentIdRaw;

  if (tree) {
    const result = await getTaxonomyTree(type, {
      selectableByCreatorOnly: scope === "creator"
    });
    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }
    return NextResponse.json({ data: result.data });
  }

  const parentFilter =
    parentId !== undefined ? { parentId } : {};

  const result =
    scope === "creator"
      ? await getTaxonomyTerms(type, {
          ...parentFilter,
          activeOnly: true,
          publicOnly: true,
          selectableByCreatorOnly: true
        })
      : scope === "featured"
        ? await getFeaturedTaxonomyTerms(type)
        : await getTaxonomyTerms(type, {
            ...parentFilter,
            activeOnly: true,
            publicOnly: true
          });
  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  return NextResponse.json({ data: result.data });
}
