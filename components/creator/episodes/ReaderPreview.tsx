type ReaderPreviewProps = {
  content: string;
  episodeTitle: string;
  storyTitle: string;
};

export function ReaderPreview({
  content,
  episodeTitle,
  storyTitle
}: ReaderPreviewProps) {
  const paragraphs = content
    .split(/\n+/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  return (
    <article className="space-y-6 rounded-lg border border-zinc-800 bg-zinc-950 p-5">
      <header className="space-y-2">
        <p className="text-sm font-medium uppercase tracking-wide text-cyan-300">
          {storyTitle}
        </p>
        <h2 className="text-2xl font-bold tracking-normal text-white">
          {episodeTitle}
        </h2>
      </header>
      <div className="space-y-6 text-xl leading-10 text-zinc-100">
        {paragraphs.map((paragraph, index) => (
          <p key={`${paragraph.slice(0, 24)}-${index}`}>{paragraph}</p>
        ))}
      </div>
    </article>
  );
}
