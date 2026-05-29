import { NextResponse } from "next/server";
import { ActionAccessError, assertActionAccess } from "@/lib/auth/assert-action-access";
import { getCurrentProfile } from "@/lib/auth/getCurrentProfile";
import { guardCollectionMutation } from "@/lib/actions/collections";
import { createCollection, getMyCollections } from "@/lib/supabase/collections";

export async function GET(request: Request) {
  const { user } = await getCurrentProfile();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    await assertActionAccess("notification.view.own");
  } catch (error) {
    const message =
      error instanceof ActionAccessError
        ? error.message
        : "Bạn không có quyền thực hiện thao tác này.";
    return NextResponse.json({ error: message }, { status: 403 });
  }

  const storyId = new URL(request.url).searchParams.get("storyId")?.trim() || null;
  const collections = await getMyCollections(50);

  if (!storyId) {
    return NextResponse.json({ collections });
  }

  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();
  const collectionIds = collections.map((collection) => collection.id);
  const containedIds = new Set<string>();

  if (collectionIds.length > 0) {
    const { data } = await supabase
      .from("collection_items")
      .select("collection_id")
      .eq("story_id", storyId)
      .in("collection_id", collectionIds);

    for (const row of data ?? []) {
      containedIds.add(row.collection_id as string);
    }
  }

  return NextResponse.json({
    collections: collections.map((collection) => ({
      ...collection,
      containsStory: containedIds.has(collection.id)
    }))
  });
}

export async function POST(request: Request) {
  const { user } = await getCurrentProfile();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    await guardCollectionMutation("save.create");
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Bạn không có quyền thực hiện thao tác này.";
    return NextResponse.json({ error: message }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const title = String(body?.title ?? "").trim();
  const description = String(body?.description ?? "").trim();
  const visibility = body?.visibility === "public" ? "public" : "private";

  if (!title) {
    return NextResponse.json({ error: "Vui lòng nhập tiêu đề tủ truyện." }, { status: 400 });
  }

  if (title.length > 60) {
    return NextResponse.json({ error: "Tên tủ tối đa 60 ký tự." }, { status: 400 });
  }

  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("collections")
    .select("id")
    .eq("user_id", user.id)
    .ilike("title", title)
    .limit(1);

  if ((existing ?? []).length > 0) {
    return NextResponse.json(
      { error: "Bạn đã có tủ truyện cùng tên." },
      { status: 400 }
    );
  }

  const id = await createCollection({ title, description, visibility });
  return NextResponse.json({ id });
}
