type ComposerValidationBadgeProps = {
  status: string | null | undefined;
};

export function ComposerValidationBadge({ status }: ComposerValidationBadgeProps) {
  if (status === "invalid") {
    return (
      <span className="inline-flex rounded-md border border-rose-400/35 bg-rose-500/15 px-1.5 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide text-rose-200">
        Composer · lỗi
      </span>
    );
  }

  if (status === "warnings") {
    return (
      <span className="inline-flex rounded-md border border-amber-400/35 bg-amber-500/15 px-1.5 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide text-amber-200">
        Composer · cảnh báo
      </span>
    );
  }

  if (status === "valid") {
    return (
      <span className="inline-flex rounded-md border border-emerald-400/30 bg-emerald-500/15 px-1.5 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide text-emerald-200">
        Composer · OK
      </span>
    );
  }

  return null;
}
