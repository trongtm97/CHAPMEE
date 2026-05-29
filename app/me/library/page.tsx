import Link from "next/link";
import { Suspense } from "react";
import { LibraryPage } from "@/components/library/LibraryPage";
import { EmptyState } from "@/components/ui";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";
import { getLibraryPageData } from "@/lib/library/get-library-page-data";

export const dynamic = "force-dynamic";

export default async function MeLibraryPage() {
  const { user } = await getCurrentUser();

  if (!user) {
    return (
      <section className="mx-auto max-w-lg pb-24 lg:max-w-2xl">
        <EmptyState
          action={
            <Link
              className="inline-flex min-h-10 items-center justify-center rounded-full bg-cyan-300 px-4 text-sm font-bold text-zinc-950"
              href="/login?next=/me/library"
            >
              Đăng nhập
            </Link>
          }
          description="Đăng nhập để quản lý tủ truyện, truyện đã lưu và tiến độ đọc."
          title="Tủ truyện"
        />
      </section>
    );
  }

  const data = await getLibraryPageData(user.id);

  return (
    <Suspense fallback={<div className="pb-24 text-sm text-zinc-500">Đang tải...</div>}>
      <LibraryPage data={data} />
    </Suspense>
  );
}
