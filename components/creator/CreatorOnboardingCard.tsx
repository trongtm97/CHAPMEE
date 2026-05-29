import Link from "next/link";
import { Card } from "@/components/ui";
import { studioPath } from "@/lib/studio/constants";

const steps = [
  "Tạo truyện đầu tiên",
  "Thêm ảnh bìa",
  "Viết chương 1",
  "Đăng hoặc lên lịch"
] as const;

export function CreatorOnboardingCard() {
  return (
    <Card className="space-y-4 border-cyan-300/20 bg-cyan-300/[0.04] p-4 sm:p-5">
      <div className="space-y-2">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-cyan-300">
          Tác giả mới
        </p>
        <h2 className="text-lg font-bold text-white sm:text-xl">
          Bắt đầu hành trình viết truyện trên ChapMee
        </h2>
        <p className="text-sm leading-relaxed text-zinc-400">
          Vài bước đơn giản để truyện đầu tiên sẵn sàng với độc giả.
        </p>
      </div>
      <ol className="space-y-2">
        {steps.map((step, index) => (
          <li
            className="flex items-center gap-3 text-sm text-zinc-300"
            key={step}
          >
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-cyan-300/15 text-xs font-black text-cyan-200">
              {index + 1}
            </span>
            {step}
          </li>
        ))}
      </ol>
      <Link
        className="tap-highlight inline-flex min-h-11 w-full items-center justify-center rounded-full bg-cyan-300 px-4 py-2 text-sm font-bold uppercase tracking-[0.12em] text-zinc-950 transition hover:bg-cyan-200"
        href={studioPath("/stories/new")}
      >
        Tạo truyện đầu tiên
      </Link>
    </Card>
  );
}
