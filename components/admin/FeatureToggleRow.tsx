"use client";

type FeatureToggleRowProps = {
  label: string;
  description: string;
  impactNote?: string;
  checked: boolean;
  disabled?: boolean;
  loading?: boolean;
  future?: boolean;
  dangerous?: boolean;
  important?: boolean;
  riskBadge?: boolean;
  onChange: (checked: boolean) => void;
};

export function FeatureToggleRow({
  label,
  description,
  impactNote,
  checked,
  disabled,
  loading,
  future,
  dangerous,
  important,
  riskBadge,
  onChange
}: FeatureToggleRowProps) {
  const isDisabled = disabled || future || loading;

  return (
    <div
      className={`rounded-2xl border p-3 ${
        dangerous && checked
          ? "border-red-500/25 bg-red-500/[0.04]"
          : important
            ? "border-amber-500/20 bg-amber-500/[0.03]"
            : "border-white/10 bg-white/[0.02]"
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold text-white">{label}</p>
            {important ? (
              <span className="rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-200">
                Quan trọng
              </span>
            ) : null}
            {riskBadge ? (
              <span className="rounded-full border border-red-500/40 bg-red-500/10 px-2 py-0.5 text-[10px] font-medium text-red-200">
                Rủi ro
              </span>
            ) : null}
            {future ? (
              <span className="rounded-full border border-zinc-600 bg-zinc-800/80 px-2 py-0.5 text-[10px] font-medium text-zinc-400">
                Sắp có
              </span>
            ) : checked ? (
              <span className="rounded-full border border-cyan-400/30 bg-cyan-400/10 px-2 py-0.5 text-[10px] font-medium text-cyan-200">
                Đang bật
              </span>
            ) : (
              <span className="rounded-full border border-zinc-600 px-2 py-0.5 text-[10px] font-medium text-zinc-400">
                Đang tắt
              </span>
            )}
          </div>
          <p className="text-xs leading-5 text-zinc-400">{description}</p>
          {impactNote ? (
            <p className="text-xs text-zinc-500">Ảnh hưởng: {impactNote}</p>
          ) : null}
          {isDisabled && !future && !loading ? (
            <p className="text-xs text-zinc-500">Cần bật hệ sinh thái tiền trước.</p>
          ) : null}
        </div>
        <button
          aria-checked={checked}
          aria-busy={loading}
          className={`relative mt-1 inline-flex h-7 w-12 shrink-0 items-center rounded-full border transition ${
            checked
              ? "border-cyan-300/60 bg-cyan-300/20"
              : "border-white/15 bg-zinc-800"
          } ${isDisabled ? "cursor-not-allowed opacity-60" : ""}`}
          disabled={isDisabled}
          onClick={() => onChange(!checked)}
          role="switch"
          type="button"
        >
          <span
            className={`inline-block h-5 w-5 rounded-full bg-white transition ${
              checked ? "translate-x-6" : "translate-x-1"
            } ${loading ? "opacity-50" : ""}`}
          />
        </button>
      </div>
    </div>
  );
}
