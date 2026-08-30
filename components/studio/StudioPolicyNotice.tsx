"use client";

type StudioPolicyNoticeProps = {
  title: string;
  items: string[];
  note?: string;
  tone?: "cyan" | "amber";
};

export function StudioPolicyNotice({
  items,
  note,
  title,
  tone = "cyan"
}: StudioPolicyNoticeProps) {
  const shellClass =
    tone === "amber"
      ? "border-amber-400/20 bg-amber-400/10"
      : "border-cyan-400/20 bg-cyan-400/10";

  const textClass = tone === "amber" ? "text-amber-50" : "text-cyan-50";
  const bulletClass = tone === "amber" ? "text-amber-300" : "text-cyan-300";

  return (
    <section className={`space-y-2 rounded-2xl border p-4 ${shellClass}`}>
      <div className="space-y-1">
        <h3 className={`text-sm font-bold ${textClass}`}>{title}</h3>
        {note ? <p className="text-xs leading-5 text-zinc-300">{note}</p> : null}
      </div>
      <ul className="space-y-1.5 text-sm leading-6 text-zinc-200">
        {items.map((item) => (
          <li className="flex gap-2" key={item}>
            <span className={bulletClass}>•</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
