"use client";

type RatingRowProps = {
  label: string;
  name: string;
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
};

export function RatingRow({ disabled, label, name, onChange, value }: RatingRowProps) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-3">
        <label className="text-sm font-medium text-zinc-200" htmlFor={name}>
          {label}
        </label>
        <span className="text-xs tabular-nums text-zinc-500">{value}/5</span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {[1, 2, 3, 4, 5].map((score) => (
          <button
            aria-label={`${label}: ${score} sao`}
            aria-pressed={value === score}
            className={`tap-highlight min-h-10 min-w-10 rounded-full border px-2.5 text-sm font-semibold transition ${
              value === score
                ? "border-amber-300/50 bg-amber-300/15 text-amber-100"
                : "border-white/[0.08] bg-white/[0.02] text-zinc-400 hover:bg-white/[0.05]"
            }`}
            disabled={disabled}
            key={score}
            onClick={() => onChange(score)}
            type="button"
          >
            {score}
          </button>
        ))}
      </div>
    </div>
  );
}

export function formatReviewScore(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) {
    return "—";
  }
  return value.toFixed(1);
}

export function formatReviewDate(value: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(new Date(value));
}
