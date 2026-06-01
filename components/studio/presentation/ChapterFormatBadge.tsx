type ChapterFormatBadgeProps = {
  contentFormat: string | null | undefined;
};

export function ChapterFormatBadge({ contentFormat }: ChapterFormatBadgeProps) {
  if (contentFormat === "structured_blocks") {
    return (
      <span className="inline-flex rounded-md border border-cyan-400/30 bg-cyan-500/15 px-1.5 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide text-cyan-200">
        Composer
      </span>
    );
  }

  if (contentFormat === "structured_json") {
    return (
      <span className="inline-flex rounded-md border border-violet-400/30 bg-violet-500/15 px-1.5 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide text-violet-200">
        JSON T6
      </span>
    );
  }

  return null;
}
