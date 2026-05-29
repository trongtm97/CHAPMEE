type OriginalsBadgeProps = {
  show: boolean;
};

export function OriginalsBadge({ show }: OriginalsBadgeProps) {
  if (!show) return null;
  return (
    <span className="inline-flex items-center rounded-full border border-amber-300/40 bg-amber-300/10 px-3 py-1 text-xs font-black uppercase tracking-[0.12em] text-amber-100">
      ChapMee Originals
    </span>
  );
}
