import Link from "next/link";

const rankingPlaceholders = [
  "Top romance tuần này",
  "Top fantasy đang hot",
  "Top creator mới nổi"
];

export function ReelsRankingPanel() {
  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-cyan-200/90">
        Ranking
      </p>
      <ul className="mt-3 space-y-2">
        {rankingPlaceholders.map((label) => (
          <li className="rounded-xl border border-white/10 bg-black/20 p-3 text-sm text-zinc-200" key={label}>
            {label}
          </li>
        ))}
      </ul>
      <Link
        className="mt-3 inline-flex rounded-full border border-white/15 px-3 py-2 text-xs font-semibold text-zinc-100"
        href="/rankings"
      >
        Xem bảng xếp hạng
      </Link>
    </section>
  );
}
