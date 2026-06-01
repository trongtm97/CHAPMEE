import type { AlgorithmExplanation } from "@/types/algorithm-explanation";

type AlgorithmTransparencyCardProps = {
  messages: AlgorithmExplanation[];
  compact?: boolean;
};

const SEVERITY_ICON: Record<string, string> = {
  info: "ℹ️",
  success: "✓",
  warning: "⚠",
  critical: "!"
};

const SEVERITY_BORDER: Record<string, string> = {
  info: "border-white/10",
  success: "border-emerald-400/30",
  warning: "border-amber-400/30",
  critical: "border-rose-400/30"
};

export function AlgorithmTransparencyCard({
  messages,
  compact = false
}: AlgorithmTransparencyCardProps) {
  if (messages.length === 0) return null;

  return (
    <section className="space-y-2">
      <h3 className="text-sm font-bold text-white">
        {compact ? "Gợi ý hiển thị" : "Minh bạch thuật toán đề xuất"}
      </h3>
      <p className="text-xs text-zinc-500">
        ChapMee cân bằng chất lượng đọc, độ mới và công bằng — không hiển thị công thức chi tiết
        để tránh lạm dụng.
      </p>
      <ul className="space-y-2">
        {messages.map((message, index) => (
          <li
            className={`rounded-xl border bg-white/[0.02] px-3 py-2.5 text-sm ${SEVERITY_BORDER[message.severity] ?? SEVERITY_BORDER.info}`}
            key={`${message.title}-${index}`}
          >
            <p className="font-semibold text-zinc-100">
              <span aria-hidden className="mr-1.5">
                {SEVERITY_ICON[message.severity] ?? "ℹ️"}
              </span>
              {message.title}
            </p>
            <p className="mt-1 leading-6 text-zinc-400">{message.message}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
