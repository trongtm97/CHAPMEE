import { sql } from "drizzle-orm";
import { db } from "@/lib/db";

/** Atomically increment a published content post's view counter. */
export async function incrementContentPostView(postId: string): Promise<void> {
  const id = postId?.trim();
  if (!id) {
    return;
  }

  await db.execute(sql`
    update public.admin_content_posts
    set view_count = coalesce(view_count, 0) + 1
    where id = ${id}::uuid
      and status = 'published'
      and deleted_at is null
  `);
}
