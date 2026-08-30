import Link from "next/link";
import { Badge, Card, SectionHeader } from "@/components/ui";
import type { CreatorProfile } from "@/lib/creator/getCreatorProfile";
import { STUDIO_FULL_NAME, studioPath } from "@/lib/studio/constants";

type CreatorStudioEntryProps = {
  creatorProfile?: CreatorProfile | null;
};

export function CreatorStudioEntry({
  creatorProfile
}: CreatorStudioEntryProps) {
  return (
    <section className="space-y-3">
      <SectionHeader title={STUDIO_FULL_NAME} />
      <Card className="space-y-4">
        {creatorProfile ? (
          <>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-base font-semibold text-white">
                  Hồ sơ tác giả đã bật
                </p>
                <p className="mt-1 text-sm text-zinc-400">
                  {creatorProfile.display_name}
                </p>
              </div>
              <Badge>{creatorProfile.status}</Badge>
            </div>
            <Link
              className="inline-flex min-h-11 w-full items-center justify-center rounded-full bg-cyan-300 px-4 py-2 text-sm font-bold uppercase tracking-[0.12em] text-zinc-950 transition hover:bg-cyan-200"
              href={studioPath()}
            >
              Vào Studio
            </Link>
          </>
        ) : (
          <>
            <div className="space-y-2">
              <p className="text-base font-semibold text-white">
                Sẵn sàng trở thành tác giả?
              </p>
              <p className="text-sm leading-6 text-zinc-400">
                Tạo hồ sơ tác giả và bắt đầu đăng truyện trên ChapMee.
              </p>
            </div>
            <Link
              className="inline-flex min-h-11 w-full items-center justify-center rounded-full bg-cyan-300 px-4 py-2 text-sm font-bold uppercase tracking-[0.12em] text-zinc-950 transition hover:bg-cyan-200"
              href={studioPath()}
            >
              Bắt đầu viết
            </Link>
          </>
        )}
      </Card>
    </section>
  );
}
