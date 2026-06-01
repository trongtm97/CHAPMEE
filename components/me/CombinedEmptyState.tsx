import Link from "next/link";
import { EmptyState } from "@/components/ui";

type CombinedEmptyStateProps = {
  title?: string;
  description?: string;
  variant?: "default" | "reading";
};

export function CombinedEmptyState({
  description = "Khám phá truyện, xem Reels hoặc bắt đầu viết để tạo hoạt động đầu tiên.",
  title = "Bạn chưa có nhiều hoạt động.",
  variant = "default"
}: CombinedEmptyStateProps) {
  return (
    <EmptyState
      action={
        <div className="flex flex-wrap justify-center gap-2">
          <Link
            className="inline-flex min-h-9 items-center justify-center rounded-full bg-cyan-300 px-4 text-xs font-bold text-zinc-950 transition hover:bg-cyan-200"
            href="/discover"
          >
            Khám phá truyện
          </Link>
          <Link
            className="inline-flex min-h-9 items-center justify-center rounded-full border border-white/12 bg-white/[0.03] px-4 text-xs font-semibold text-zinc-200 transition hover:border-cyan-300/25"
            href="/reels"
          >
            Xem Reels
          </Link>
          {variant === "default" ? (
            <Link
              className="inline-flex min-h-9 items-center justify-center rounded-full border border-white/12 bg-white/[0.03] px-4 text-xs font-semibold text-zinc-200 transition hover:border-cyan-300/25"
              href="/studio/setup"
            >
              Bắt đầu viết
            </Link>
          ) : null}
        </div>
      }
      className="py-6"
      description={description}
      title={title}
    />
  );
}
