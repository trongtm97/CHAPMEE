type LoadingStateProps = {
  label?: string;
  className?: string;
};

export function LoadingState({
  className = "",
  label = "Loading..."
}: LoadingStateProps) {
  return (
    <div
      className={`flex min-h-32 items-center justify-center rounded-[1.25rem] border border-white/10 bg-[var(--surface)] p-5 text-sm font-medium text-zinc-400 shadow-[0_16px_32px_rgba(0,0,0,0.22)] ${className}`}
      role="status"
    >
      {label}
    </div>
  );
}
