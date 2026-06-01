"use client";

type Props = {
  title: string;
  slug: string;
  excerpt: string;
  coverUrl: string;
  seoTitle: string;
  seoDescription: string;
  content: string;
};

export function ContentPostPreview({
  title,
  slug,
  excerpt,
  coverUrl,
  seoTitle,
  seoDescription,
  content
}: Props) {
  const displayTitle = title || "Tiêu đề bài viết";
  const snippetTitle = seoTitle.trim() || displayTitle;
  const snippetDesc = seoDescription.trim() || excerpt.trim() || content.slice(0, 140);
  const paragraphs = content.split("\n").filter(Boolean).slice(0, 4);

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-white/10 bg-zinc-950 p-4">
        <p className="text-xs text-zinc-500">Preview bài viết</p>
        {coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img alt="" className="mt-3 w-full rounded-xl object-cover" src={coverUrl} />
        ) : null}
        <h3 className="mt-3 text-lg font-semibold text-white">{displayTitle}</h3>
        {excerpt ? <p className="mt-1 text-sm text-zinc-400">{excerpt}</p> : null}
        <div className="mt-3 space-y-2 text-sm text-zinc-300">
          {paragraphs.map((line, index) => (
            <p key={index}>{line.replace(/^#+\s*/, "")}</p>
          ))}
        </div>
      </div>
      <div className="rounded-xl border border-white/10 bg-zinc-950/80 p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">SEO snippet</p>
        <p className="mt-2 text-sm text-cyan-300">{snippetTitle}</p>
        <p className="text-xs text-emerald-400">chapmee.vn › bai-viet › {slug || "slug"}</p>
        <p className="mt-1 line-clamp-2 text-xs text-zinc-400">{snippetDesc}</p>
      </div>
    </div>
  );
}
