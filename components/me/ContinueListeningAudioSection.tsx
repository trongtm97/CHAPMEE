import Link from "next/link";
import type { ContinueListeningAudioItem } from "@/src/lib/audio/continue-listening";

type ContinueListeningAudioSectionProps = {
  items: ContinueListeningAudioItem[];
  compact?: boolean;
  maxItems?: number;
};

export function ContinueListeningAudioSection({
  items,
  compact = false,
  maxItems = 3
}: ContinueListeningAudioSectionProps) {
  const visible = items.slice(0, maxItems);
  if (visible.length === 0) {
    return null;
  }

  return (
    <section className="space-y-2 rounded-xl border border-emerald-400/20 bg-emerald-400/5 p-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-bold text-emerald-100">Nghe tiếp</h2>
        <Link className="text-xs font-semibold text-cyan-200 hover:text-cyan-100" href="/media?tab=audio">
          Xem thêm
        </Link>
      </div>
      <ul className={compact ? "space-y-2" : "space-y-2.5"}>
        {visible.map((item) => (
          <li key={`${item.storyId}-${item.audioItemId}`}>
            <Link
              className="block rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 transition hover:border-cyan-300/30 hover:bg-white/[0.05]"
              href={`${item.storyHref}#audio`}
            >
              <p className="line-clamp-1 text-sm font-semibold text-white">{item.storyTitle}</p>
              <p className="mt-0.5 line-clamp-1 text-xs text-zinc-400">
                {item.audioTitle} · {item.partLabel}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
