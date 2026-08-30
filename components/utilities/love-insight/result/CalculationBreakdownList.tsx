import type { CalculationBreakdownItem } from '@/lib/love-engine/explanation';

interface CalculationBreakdownListProps {
  items: CalculationBreakdownItem[];
}

/**
 * Danh sách accordion (dùng `<details>`) cho calculation breakdown.
 * Mỗi item hiển thị label + score ở header, mở rộng ra để xem
 * `why` + `rawDisplay` + `weight`. Mobile-first, không cần JS.
 */
export function CalculationBreakdownList({ items }: CalculationBreakdownListProps) {
  return (
    <div className="space-y-3">
      {items.map((item, idx) => (
        <BreakdownItem
          key={item.label}
          item={item}
          defaultOpen={idx === 0}
        />
      ))}
    </div>
  );
}

function BreakdownItem({
  item,
  defaultOpen,
}: {
  item: CalculationBreakdownItem;
  defaultOpen?: boolean;
}) {
  return (
    <details
      open={defaultOpen}
      className="group rounded-2xl border border-white/10 bg-card-glass shadow-card backdrop-blur-md open:bg-white/5"
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 [&::-webkit-details-marker]:hidden">
        <div className="flex flex-1 items-baseline gap-3">
          <h3 className="font-semibold text-white">{item.label}</h3>
          {typeof item.weight === 'number' ? (
            <span className="text-xs text-lavender-400/80">
              · trọng số {(item.weight * 100).toFixed(0)}%
            </span>
          ) : null}
        </div>
        <span className="text-display text-2xl font-bold text-rose-300">
          {item.score}
          <span className="ml-1 text-xs font-normal text-lavender-300">/100</span>
        </span>
        <span
          aria-hidden
          className="ml-2 text-lavender-300 transition group-open:rotate-180"
        >
          ▾
        </span>
      </summary>
      <div className="border-t border-white/5 px-4 py-3">
        <p className="text-sm leading-relaxed text-lavender-100">{item.why}</p>
        {item.rawDisplay ? (
          <p className="mt-2 break-words text-xs text-lavender-400/80">
            <span className="font-semibold uppercase tracking-wide">Dữ liệu thô:</span> {item.rawDisplay}
          </p>
        ) : null}
      </div>
    </details>
  );
}