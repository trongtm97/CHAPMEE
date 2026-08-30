import Link from "next/link";
import { EmptyState } from "@/components/ui";

export default function PublicProfileNotFound() {
  return (
    <div className="mx-auto max-w-lg py-16">
      <EmptyState
        description="Kiểm tra lại @username hoặc quay về khám phá nội dung mới."
        title="Không tìm thấy hồ sơ"
      />
      <div className="mt-6 flex justify-center gap-3">
        <Link
          className="inline-flex min-h-10 items-center rounded-full bg-cyan-300 px-5 text-sm font-semibold text-zinc-950"
          href="/"
        >
          Về Reels
        </Link>
        <Link
          className="inline-flex min-h-10 items-center rounded-full border border-white/12 px-5 text-sm font-semibold text-zinc-200"
          href="/discover"
        >
          Khám phá
        </Link>
      </div>
    </div>
  );
}
