type EmptyAnalyticsStateProps = {
  title: string;
  description: string;
};

export function EmptyAnalyticsState({ title, description }: EmptyAnalyticsStateProps) {
  return (
    <div className="mt-4 rounded-lg border border-white/10 bg-black/20 px-4 py-3">
      <p className="text-sm font-medium text-zinc-200">{title}</p>
      <p className="mt-1 text-sm text-zinc-400">{description}</p>
    </div>
  );
}
