"use client";

export type StoryCreateChecklistItem = {
  id: string;
  label: string;
  done: boolean;
  optional?: boolean;
};

type StoryCreateChecklistProps = {
  items: StoryCreateChecklistItem[];
  defaultOpen?: boolean;
};

export function StoryCreateChecklist({
  defaultOpen = false,
  items
}: StoryCreateChecklistProps) {
  const doneCount = items.filter((i) => i.done).length;

  return (
    <details className="group" open={defaultOpen}>
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 marker:content-none [&::-webkit-details-marker]:hidden">
        <span className="text-sm font-bold text-white">Checklist</span>
        <span className="text-xs text-zinc-500">
          {doneCount}/{items.length}
          <span className="ml-1 text-zinc-600 group-open:hidden">· mở</span>
        </span>
      </summary>
      <ul className="mt-3 max-h-48 space-y-1.5 overflow-y-auto">
        {items.map((item) => (
          <li className="flex items-start gap-2 text-xs" key={item.id}>
            <span
              aria-hidden
              className={`mt-0.5 shrink-0 ${
                item.done ? "text-emerald-400" : "text-zinc-600"
              }`}
            >
              {item.done ? "✓" : "○"}
            </span>
            <span
              className={
                item.done
                  ? "text-zinc-500 line-through"
                  : item.optional
                    ? "text-zinc-500"
                    : "text-zinc-300"
              }
            >
              {item.label}
              {item.optional ? (
                <span className="ml-1 text-zinc-600">(khuyến nghị)</span>
              ) : null}
            </span>
          </li>
        ))}
      </ul>
    </details>
  );
}
