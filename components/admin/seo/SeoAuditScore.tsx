"use client";

type SeoAuditScoreProps = {
  score: number;
  label?: string;
  size?: "sm" | "md" | "lg";
};

function scoreTone(score: number) {
  if (score >= 85) {
    return { ring: "stroke-emerald-400", text: "text-emerald-300", bg: "bg-emerald-400/10" };
  }
  if (score >= 60) {
    return { ring: "stroke-amber-400", text: "text-amber-200", bg: "bg-amber-400/10" };
  }
  return { ring: "stroke-red-400", text: "text-red-200", bg: "bg-red-400/10" };
}

export function SeoAuditScore({ score, label = "SEO Score", size = "md" }: SeoAuditScoreProps) {
  const clamped = Math.max(0, Math.min(100, score));
  const tone = scoreTone(clamped);
  const dimensions =
    size === "lg"
      ? { box: "size-28", text: "text-3xl", label: "text-sm" }
      : size === "sm"
        ? { box: "size-16", text: "text-lg", label: "text-[10px]" }
        : { box: "size-20", text: "text-2xl", label: "text-xs" };

  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (clamped / 100) * circumference;

  return (
    <div className={`flex items-center gap-4 rounded-2xl border border-white/10 p-4 ${tone.bg}`}>
      <div className={`relative ${dimensions.box}`}>
        <svg className="-rotate-90" viewBox="0 0 100 100">
          <circle
            className="stroke-white/10"
            cx="50"
            cy="50"
            fill="none"
            r={radius}
            strokeWidth="8"
          />
          <circle
            className={tone.ring}
            cx="50"
            cy="50"
            fill="none"
            r={radius}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            strokeWidth="8"
          />
        </svg>
        <span
          className={`absolute inset-0 flex items-center justify-center font-bold ${dimensions.text} ${tone.text}`}
        >
          {clamped}
        </span>
      </div>
      <div>
        <p className={`font-semibold text-zinc-100 ${dimensions.label}`}>{label}</p>
        <p className="mt-1 text-xs text-zinc-400">
          Title 15 · Desc 15 · Canonical 10 · Robots 10 · OG 15 · Block 15 · No critical 20
        </p>
      </div>
    </div>
  );
}
