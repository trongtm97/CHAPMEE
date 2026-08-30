export type StoryAudioBadgeDisplay = {
  showAudioBadge?: boolean;
  showContinuousBadge?: boolean;
};

type StoryAudioBadgeProps = StoryAudioBadgeDisplay & {
  hasPublishedAudio?: boolean;
  hasContinuousPlayback?: boolean;
  showAudioBadge?: boolean;
  showContinuousBadge?: boolean;
  className?: string;
};

export function StoryAudioBadge({
  hasPublishedAudio = false,
  hasContinuousPlayback = false,
  showAudioBadge = true,
  showContinuousBadge = true,
  className = ""
}: StoryAudioBadgeProps) {
  const showAudio = showAudioBadge && hasPublishedAudio;
  const showContinuous = showContinuousBadge && hasContinuousPlayback;

  if (!showAudio && !showContinuous) {
    return null;
  }

  return (
    <span className={`inline-flex flex-wrap items-center gap-1 ${className}`.trim()}>
      {showAudio ? (
        <span className="rounded-full border border-emerald-400/25 bg-emerald-400/10 px-1.5 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide text-emerald-100">
          Có audio
        </span>
      ) : null}
      {showContinuous ? (
        <span className="rounded-full border border-indigo-400/25 bg-indigo-400/10 px-1.5 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide text-indigo-100">
          Nghe liên tục
        </span>
      ) : null}
    </span>
  );
}
