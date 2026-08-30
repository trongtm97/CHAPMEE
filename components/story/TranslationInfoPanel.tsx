import { AuthorNameLink } from "@/components/profile/AuthorNameLink";
import type { StoryDetail } from "@/lib/stories/getStoryBySlug";

type TranslationInfoPanelProps = {
  story: StoryDetail;
};

export function TranslationInfoPanel({ story }: TranslationInfoPanelProps) {
  if (story.contentOrigin !== "translation") {
    return null;
  }

  const verified = story.rightsStatus === "verified";

  return (
    <section className="space-y-3 rounded-xl border border-amber-400/20 bg-amber-400/5 p-4">
      <div className="flex flex-wrap gap-2">
        <Badge label="Truyện Dịch" tone="amber" />
        <Badge label="Miễn phí" tone="cyan" />
        {verified ? <Badge label="Dịch có phép" tone="emerald" /> : null}
      </div>
      <p className="text-sm text-zinc-300">
        Dịch bởi{" "}
        <AuthorNameLink
          className="text-cyan-100"
          name={story.creatorName ?? "ChapMee"}
          nameClassName="text-cyan-100"
          username={story.creatorUsername}
        />
      </p>
    </section>
  );
}

function Badge({ label, tone }: { label: string; tone: "amber" | "cyan" | "emerald" }) {
  const toneClass =
    tone === "emerald"
      ? "bg-emerald-400/15 text-emerald-100"
      : tone === "cyan"
        ? "bg-cyan-300/15 text-cyan-100"
        : "bg-amber-400/15 text-amber-100";
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${toneClass}`}>
      {label}
    </span>
  );
}
