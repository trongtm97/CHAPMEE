import type {
  AdviceItem,
  InsightItem,
  RiskItem,
  StrengthItem,
} from '@/lib/love-engine/explanation';

interface InsightsListProps {
  items: InsightItem[];
}

export function InsightsList({ items }: InsightsListProps) {
  if (items.length === 0) {
    return null;
  }
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {items.map((insight, i) => (
        <div
          key={i}
          className="rounded-2xl border border-white/10 bg-card-glass p-5 shadow-card backdrop-blur-md"
        >
          <h3 className="text-display text-lg font-bold text-white">
            {insight.title}
          </h3>
          <p className="mt-3 text-sm leading-relaxed text-lavender-100">
            {insight.text}
          </p>
          <p className="mt-3 text-xs uppercase tracking-wide text-lavender-400/70">
            Dựa trên: {insight.basedOn}
          </p>
        </div>
      ))}
    </div>
  );
}

// =============================================================================
// Strengths / Risks / Advice — render cùng shape, tone khác nhau
// =============================================================================

interface StrengthsListProps {
  items: StrengthItem[];
}

export function StrengthsList({ items }: StrengthsListProps) {
  if (items.length === 0) return null;
  return (
    <ul className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {items.map((s, i) => (
        <li
          key={i}
          className="rounded-2xl border border-emerald-400/30 bg-emerald-500/5 p-5"
        >
          <p className="text-display text-base font-bold text-emerald-200">
            ✓ {s.title}
          </p>
          <p className="mt-2 text-sm leading-relaxed text-lavender-100">{s.text}</p>
          <p className="mt-3 text-xs uppercase tracking-wide text-emerald-300/70">
            {s.basedOn}
          </p>
        </li>
      ))}
    </ul>
  );
}

interface RisksListProps {
  items: RiskItem[];
}

export function RisksList({ items }: RisksListProps) {
  if (items.length === 0) return null;
  return (
    <ul className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {items.map((r, i) => (
        <li
          key={i}
          className="rounded-2xl border border-rose-400/30 bg-rose-500/5 p-5"
        >
          <p className="text-display text-base font-bold text-rose-200">
            ! {r.title}
          </p>
          <p className="mt-2 text-sm leading-relaxed text-lavender-100">{r.text}</p>
          <p className="mt-3 rounded-lg border border-rose-300/20 bg-rose-300/5 px-3 py-2 text-xs leading-relaxed text-rose-100">
            <span className="font-semibold">Cách xử lý:</span> {r.howToHandle}
          </p>
          <p className="mt-2 text-xs uppercase tracking-wide text-rose-300/70">
            {r.basedOn}
          </p>
        </li>
      ))}
    </ul>
  );
}

interface AdviceListProps {
  items: AdviceItem[];
}

export function AdviceList({ items }: AdviceListProps) {
  if (items.length === 0) return null;
  return (
    <ul className="space-y-3">
      {items.map((a, i) => (
        <li
          key={i}
          className="rounded-2xl border border-gold-300/30 bg-gold-500/5 p-5"
        >
          <p className="text-display text-base font-bold text-gold-200">
            💡 {a.title}
          </p>
          <p className="mt-2 text-sm leading-relaxed text-lavender-100">{a.text}</p>
          <p className="mt-3 text-xs uppercase tracking-wide text-gold-300/70">
            {a.basedOn}
          </p>
        </li>
      ))}
    </ul>
  );
}