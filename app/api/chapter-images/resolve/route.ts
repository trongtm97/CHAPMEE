import { NextResponse } from "next/server";
import { createClient } from "@/lib/data/server";
import { getChapterImagesMap } from "@/lib/images/get-chapter-images-map";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { ids?: string[] };
    const ids = Array.isArray(body.ids) ? body.ids.filter(Boolean) : [];

    if (ids.length === 0) {
      return NextResponse.json({ images: {} });
    }

    const db = await createClient();
    const images = await getChapterImagesMap(db, ids);

    return NextResponse.json({ images });
  } catch {
    return NextResponse.json({ error: "Không thể tải ảnh." }, { status: 500 });
  }
}
