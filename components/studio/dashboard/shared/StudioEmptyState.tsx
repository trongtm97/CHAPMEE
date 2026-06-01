import type { ReactNode } from "react";

type StudioEmptyStateProps = {
  title: string;
  description?: string;
  action?: ReactNode;
  /** Không bọc Card — dùng trong panel có sẵn viền. */
  bare?: boolean;
  /** Căn giữa trong panel — dùng khi section trống. */
  centered?: boolean;
};

export function StudioEmptyState({
  action,
  bare = false,
  centered = false,
  description,
  title
}: StudioEmptyStateProps) {
  const content = (
    <>
      <p className="text-sm font-medium text-white">{title}</p>
      {description ? (
        <p className="mt-0.5 text-xs leading-snug text-zinc-400 sm:text-sm">
          {description}
        </p>
      ) : null}
      {action ? (
        <div
          className={`mt-2 flex flex-wrap gap-1.5 ${centered ? "justify-center" : ""}`}
        >
          {action}
        </div>
      ) : null}
    </>
  );

  if (bare) {
    if (centered) {
      return (
        <div className="flex flex-1 flex-col items-center justify-center py-4 text-center">
          {content}
        </div>
      );
    }

    return <div className="py-0.5">{content}</div>;
  }

  return (
    <div
      className={`rounded-lg border border-white/10 bg-white/[0.02] p-2.5 ${
        centered ? "text-center" : ""
      }`}
    >
      {content}
    </div>
  );
}
