import Link from "next/link";

type ProfileEmptyStateProps = {
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
  compact?: boolean;
};

function EmptyIllustration() {
  return (
    <div
      aria-hidden="true"
      className="mx-auto mb-3 flex size-12 items-center justify-center rounded-2xl border border-white/8 bg-white/[0.03] text-zinc-500"
    >
      <svg className="size-6" fill="none" viewBox="0 0 24 24">
        <path
          d="M6 4.5h12A1.5 1.5 0 0 1 19.5 6v12A1.5 1.5 0 0 1 18 19.5H6A1.5 1.5 0 0 1 4.5 18V6A1.5 1.5 0 0 1 6 4.5Z"
          stroke="currentColor"
          strokeWidth="1.5"
        />
        <path
          d="M8 9h8M8 12.5h5.5"
          stroke="currentColor"
          strokeLinecap="round"
          strokeWidth="1.5"
        />
      </svg>
    </div>
  );
}

export function ProfileEmptyState({
  actionHref,
  actionLabel,
  compact = false,
  description,
  title
}: ProfileEmptyStateProps) {
  return (
    <div
      className={`rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-4 text-center ${
        compact ? "py-6" : "py-10"
      }`}
    >
      <EmptyIllustration />
      <h3 className="text-sm font-bold text-white sm:text-base">{title}</h3>
      <p className="mx-auto mt-1.5 max-w-sm text-xs leading-5 text-zinc-500 sm:text-sm">
        {description}
      </p>
      {actionLabel && actionHref ? (
        <div className="mt-4">
          <Link
            className="inline-flex h-9 items-center justify-center rounded-full bg-cyan-300 px-5 text-sm font-semibold text-zinc-950 transition hover:bg-cyan-200"
            href={actionHref}
          >
            {actionLabel}
          </Link>
        </div>
      ) : null}
    </div>
  );
}
