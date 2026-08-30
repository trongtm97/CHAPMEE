import { NextResponse } from "next/server";
import { assertCollectionOwner } from "@/lib/actions/collections";
import { getCurrentProfile } from "@/lib/auth/getCurrentProfile";
import { addStoryToCollection, removeStoryFromCollection } from "@/lib/data/collections";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user } = await getCurrentProfile();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    await assertCollectionOwner(id, "save.create");
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Bạn không có quyền thực hiện thao tác này.";
    return NextResponse.json({ error: message }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const storyId = String(body?.storyId ?? "").trim();
  if (!storyId) {
    return NextResponse.json({ error: "Thiếu storyId" }, { status: 400 });
  }

  await addStoryToCollection(id, storyId, body?.note ?? null);
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user } = await getCurrentProfile();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    await assertCollectionOwner(id, "save.delete.own");
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Bạn không có quyền thực hiện thao tác này.";
    return NextResponse.json({ error: message }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const storyId = String(body?.storyId ?? "").trim();
  if (!storyId) {
    return NextResponse.json({ error: "Thiếu storyId" }, { status: 400 });
  }

  await removeStoryFromCollection(id, storyId);
  return NextResponse.json({ ok: true });
}
